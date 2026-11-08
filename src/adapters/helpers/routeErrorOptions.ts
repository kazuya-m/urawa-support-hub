import type { ErrorHandlingOptions } from '@/adapters/helpers/withErrorHandling.ts';
import { LogCategory } from '@/shared/logging/types.ts';

/**
 * ルートごとのエラー応答とログの設定（withErrorHandling に渡す）
 * 各ルートで本番に到達するエラーの経路の応答・ログを、集約前の Controller と同じに保つ
 * - collect-tickets: UseCase の AppError
 * - send-notification: リクエスト検証中の想定外エラー（severity は critical）
 * - ticket-summary: UseCase の想定外エラー
 */

export const TICKET_COLLECTION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'UseCase error in ticket collection',
  category: LogCategory.TICKET_COLLECTION,
  unexpectedResponse: (errorMessage) => ['Ticket collection failed', errorMessage],
};

export const NOTIFICATION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in NotificationController',
  category: LogCategory.NOTIFICATION,
  severity: 'critical',
  unexpectedResponse: (errorMessage) => ['Internal Server Error', errorMessage],
};

export const TICKET_SUMMARY_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in ticket summary processing',
  category: LogCategory.NOTIFICATION,
  context: { processingStage: 'TicketSummaryController' },
  unexpectedResponse: (errorMessage) => [
    'Internal server error during ticket summary processing',
    { errorType: 'UnknownError', errorMessage },
  ],
};
