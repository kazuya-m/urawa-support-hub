import { Notification } from '@/domain/entities/Notification.ts';
import type { NotificationType } from '@/domain/config/NotificationConfig.ts';
import type { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import type { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import type { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { formatMatchName } from '@/shared/utils/match.ts';
import { formatJST } from '@/shared/utils/datetime.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ErrorCodes } from '@/shared/errors/ErrorCodes.ts';

export interface NotificationExecutionInput {
  ticketId: string;
  notificationType: NotificationType;
}

export interface NotificationResult {
  status: 'success' | 'error';
  ticketId: string;
  notificationType: string;
  executionDurationMs: number;
  errorMessage?: string;
}

export interface SendNotificationDeps {
  ticketRepository: Pick<TicketRepository, 'findById'>;
  notificationRepository: Pick<NotificationRepository, 'findByTicketId' | 'save' | 'update'>;
  lineClient: Pick<LineClient, 'broadcast'>;
  sleep: (ms: number) => Promise<void>;
}

const MAX_RETRIES = 3;

export async function sendNotification(
  deps: SendNotificationDeps,
  input: NotificationExecutionInput,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    await deliverScheduledNotification(deps, input);

    return {
      status: 'success',
      ticketId: input.ticketId,
      notificationType: input.notificationType,
      executionDurationMs: Date.now() - startTime,
    };
  } catch (error) {
    CloudLogger.error('Scheduled notification failed', {
      category: LogCategory.NOTIFICATION,
      context: {
        ticketId: input.ticketId,
        stage: 'usecase_error',
      },
      metadata: {
        notificationTypeKey: input.notificationType,
      },
      error: toErrorInfo(error, undefined, true),
    });

    return {
      status: 'error',
      ticketId: input.ticketId,
      notificationType: input.notificationType,
      executionDurationMs: Date.now() - startTime,
      errorMessage: getErrorMessage(error),
    };
  }
}

async function deliverScheduledNotification(
  deps: SendNotificationDeps,
  input: NotificationExecutionInput,
): Promise<void> {
  const { ticketId, notificationType } = input;

  try {
    const ticket = await deps.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    const existingHistories = await deps.notificationRepository.findByTicketId(ticketId);

    let history = existingHistories.find((history) =>
      history.notificationType === notificationType
    );

    if (!history) {
      history = new Notification({
        id: crypto.randomUUID(),
        ticketId,
        notificationType,
        scheduledAt: new Date(),
        sentAt: null,
        status: 'scheduled',
        errorMessage: null,
        cloudTaskId: null,
        createdAt: new Date(),
        updatedAt: null,
      });
      await deps.notificationRepository.save(history);
    }

    if (history.status === 'sent') {
      return;
    }

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < MAX_RETRIES) {
      try {
        const lineMessage = LINE_MESSAGE_TEMPLATES.ticketNotification(
          formatMatchName(ticket),
          formatJST(ticket.matchDate, 'M/d(eeeee) HH:mm'),
          ticket.venue || '未定',
          ticket.saleStartDate ? formatJST(ticket.saleStartDate, 'M/d(eeeee) HH:mm') : '未定',
          notificationType,
          ticket.ticketUrl ?? undefined,
        );

        await deps.lineClient.broadcast(lineMessage);

        const updatedHistory = history.markAsSent();
        await deps.notificationRepository.update(updatedHistory);
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount < MAX_RETRIES) {
          const delayMs = Math.pow(2, retryCount - 1) * 1000;
          await deps.sleep(delayMs);
        }
      }
    }

    await handleFailedNotification(
      deps,
      history,
      lastError ?? new Error('Unknown notification error after retries'),
    );
  } catch (error) {
    CloudLogger.error('Scheduled notification processing failed', {
      category: LogCategory.NOTIFICATION,
      context: {
        ticketId,
        stage: 'scheduled_notification',
      },
      error: toErrorInfo(error, ErrorCodes.NOTIFICATION_FAILED, false),
    });
    throw error;
  }
}

async function handleFailedNotification(
  deps: SendNotificationDeps,
  history: Notification,
  error: Error,
): Promise<void> {
  const failedHistory = history.markAsFailed(error.message);
  await deps.notificationRepository.update(failedHistory);

  CloudLogger.error('Notification failed after maximum retries', {
    category: LogCategory.NOTIFICATION,
    context: {
      ticketId: history.ticketId,
      notificationId: history.id,
      stage: 'retry_exhausted',
    },
    error: toErrorInfo(error, ErrorCodes.MAX_RETRIES_EXCEEDED, false),
    metadata: {
      notificationType: history.getNotificationTypeDisplayName(),
      maxRetries: MAX_RETRIES,
    },
  });
}
