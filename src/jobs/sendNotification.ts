/**
 * 予約済み通知の送信（/api/send-notification。Cloud Tasks から呼ばれる）
 * チケットを DB から取得し、通知記録を確保してから LINE に broadcast し、記録を sent にする
 *
 * 送信手順（通知記録の扱い・プロセス内のリトライ）は #247 で作り直すため、移行前の処理をそのまま移している
 */

import { Notification } from '@/domain/entities/Notification.ts';
import type { NotificationType } from '@/domain/config/NotificationConfig.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { getAppConfig } from '@/config/app-config.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
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
  /** リトライ間の待ち（テストでは待たずに記録する） */
  sleep: (ms: number) => Promise<void>;
}

const MAX_RETRIES = 3;

/**
 * 本番の依存を作る（Supabase と LINE だけ）
 */
export function createSendNotificationDeps(): SendNotificationDeps {
  const config = getAppConfig();
  const supabaseClient = getSupabaseAdminClient();
  return {
    ticketRepository: new TicketRepository(supabaseClient),
    notificationRepository: new NotificationRepository(supabaseClient),
    lineClient: new LineClient(config.line),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

/**
 * 通知を送り、結果を返す（例外は投げない）
 * - チケットなし・DB の失敗: ERROR ログを 2 件出し、status: 'error' を返す
 * - LINE が MAX_RETRIES 回失敗: 記録を failed にして ERROR ログを出し、status: 'success' を返す（#237 で直す）
 */
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
        // deliverScheduledNotification の metadata.notificationType は表示名なので、別のキーにする
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
    // 1. チケットを取得する
    const ticket = await deps.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // 2. 通知記録を取得し、なければ作る
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

    // 3. 送信済みなら何もしない
    if (history.status === 'sent') {
      return;
    }

    // 4. broadcast して sent にする（失敗したら指数バックオフで再試行する）
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

    // 5. すべて失敗したら failed を記録する（例外は投げない）
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
