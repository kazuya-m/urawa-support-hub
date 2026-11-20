import type { NotificationType } from '@/domain/config/NotificationConfig.ts';
import type { Ticket } from '@/domain/entities/Ticket.ts';
import { calculateNotificationTime, isWithinSendWindow } from '@/domain/notification.ts';
import type { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import type {
  NotificationKey,
  NotificationRepository,
} from '@/infrastructure/repositories/NotificationRepository.ts';
import type { LineClient, LineMessage } from '@/infrastructure/clients/LineClient.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { formatMatchName } from '@/shared/utils/match.ts';
import { formatJST } from '@/shared/utils/datetime.ts';
import { toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ErrorCodes } from '@/shared/errors/ErrorCodes.ts';

export interface NotificationExecutionInput {
  ticketId: string;
  notificationType: NotificationType;
}

export type SkipReason =
  | 'ticket_not_found'
  | 'no_sale_start_date'
  | 'outside_send_window'
  | 'already_sent';

export type RetryReason = 'claimed_by_another' | 'line_unavailable';

export type SendNotificationOutcome =
  | { kind: 'sent'; notificationId: string }
  | { kind: 'skipped'; reason: SkipReason }
  | { kind: 'rejected'; notificationId: string; status: number }
  | { kind: 'retry'; reason: RetryReason };

export interface SendNotificationDeps {
  ticketRepository: Pick<TicketRepository, 'findById'>;
  notificationRepository: Pick<
    NotificationRepository,
    'claim' | 'findStatusByKey' | 'markSent' | 'markFailed'
  >;
  lineClient: Pick<LineClient, 'broadcastWithRetryKey'>;
  now: () => Date;
}

export async function sendNotification(
  deps: SendNotificationDeps,
  input: NotificationExecutionInput,
): Promise<SendNotificationOutcome> {
  const { ticketId, notificationType } = input;

  const ticket = await deps.ticketRepository.findById(ticketId);
  if (!ticket) return skip(input, 'ticket_not_found');
  if (!ticket.saleStartDate) return skip(input, 'no_sale_start_date');

  const now = deps.now();
  if (!isWithinSendWindow(notificationType, ticket.saleStartDate, now)) {
    return skip(input, 'outside_send_window', {
      saleStartDate: ticket.saleStartDate.toISOString(),
      now: now.toISOString(),
    });
  }

  const key: NotificationKey = {
    ticketId,
    notificationType,
    notificationTime: calculateNotificationTime(notificationType, ticket.saleStartDate),
  };
  const claimed = await deps.notificationRepository.claim(
    key,
    buildMessage(ticket, notificationType),
  );
  if (!claimed) {
    const status = await deps.notificationRepository.findStatusByKey(key);
    if (status === 'sent') return skip(input, 'already_sent');
    return retry(input, 'claimed_by_another', { status });
  }

  const result = await deps.lineClient.broadcastWithRetryKey(claimed.message, claimed.id);

  switch (result.kind) {
    case 'accepted':
    case 'already_accepted':
      await recordSent(deps, input, claimed.id);
      return { kind: 'sent', notificationId: claimed.id };
    case 'rejected':
      await deps.notificationRepository.markFailed(claimed.id, result.detail);
      CloudLogger.error('LINE rejected the notification', {
        category: LogCategory.NOTIFICATION,
        context: { ticketId, notificationId: claimed.id, stage: 'line_rejected' },
        metadata: { notificationType, lineStatus: result.status },
        error: {
          code: ErrorCodes.NOTIFICATION_FAILED,
          details: result.detail,
          recoverable: false,
        },
      });
      return { kind: 'rejected', notificationId: claimed.id, status: result.status };
    case 'retryable':
      await deps.notificationRepository.markFailed(claimed.id, result.detail);
      return retry(input, 'line_unavailable', {
        notificationId: claimed.id,
        detail: result.detail,
      });
  }
}

async function recordSent(
  deps: SendNotificationDeps,
  input: NotificationExecutionInput,
  notificationId: string,
): Promise<void> {
  try {
    await deps.notificationRepository.markSent(notificationId, deps.now());
    CloudLogger.info('Notification sent', {
      category: LogCategory.NOTIFICATION,
      context: { ticketId: input.ticketId, notificationId, stage: 'sent' },
      metadata: { notificationType: input.notificationType },
    });
  } catch (error) {
    CloudLogger.error('Notification sent but failed to record it', {
      category: LogCategory.NOTIFICATION,
      context: { ticketId: input.ticketId, notificationId, stage: 'record_sent' },
      metadata: { notificationType: input.notificationType },
      error: toErrorInfo(error, ErrorCodes.NOTIFICATION_FAILED, false),
    });
  }
}

function buildMessage(ticket: Ticket, notificationType: NotificationType): LineMessage {
  return LINE_MESSAGE_TEMPLATES.ticketNotification(
    formatMatchName(ticket),
    formatJST(ticket.matchDate, 'M/d(eeeee) HH:mm'),
    ticket.venue || '未定',
    ticket.saleStartDate ? formatJST(ticket.saleStartDate, 'M/d(eeeee) HH:mm') : '未定',
    notificationType,
    ticket.ticketUrl ?? undefined,
  );
}

function skip(
  input: NotificationExecutionInput,
  reason: SkipReason,
  data?: Record<string, unknown>,
): SendNotificationOutcome {
  CloudLogger.info(`Notification skipped: ${reason}`, {
    category: LogCategory.NOTIFICATION,
    context: { ticketId: input.ticketId, stage: 'skipped' },
    metadata: { notificationType: input.notificationType, reason },
    data,
  });
  return { kind: 'skipped', reason };
}

function retry(
  input: NotificationExecutionInput,
  reason: RetryReason,
  data?: Record<string, unknown>,
): SendNotificationOutcome {
  CloudLogger.warning(`Notification will be retried: ${reason}`, {
    category: LogCategory.NOTIFICATION,
    context: { ticketId: input.ticketId, stage: 'retry' },
    metadata: { notificationType: input.notificationType, reason },
    data,
  });
  return { kind: 'retry', reason };
}
