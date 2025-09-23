import {
  BatchExecutionInput,
  INotificationBatchUseCase,
} from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class NotificationBatchController {
  constructor(
    private readonly notificationBatchUseCase: INotificationBatchUseCase,
  ) {}

  async handleProcessPendingNotifications(_req: Request): Promise<Response> {
    try {
      const input: BatchExecutionInput = { operation: 'process_pending' };
      const result = await this.notificationBatchUseCase.execute(input);

      return HttpResponseBuilder.success({
        operation: result.operation,
        processed: result.processed,
        failed: result.failed,
        cleaned: result.cleaned,
        executionTimeMs: result.executionDurationMs,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        CloudLogger.error('Batch UseCase error in pending notifications processing', {
          category: LogCategory.NOTIFICATION,
          error: {
            details: error.message,
            recoverable: true,
          },
        });
        return HttpResponseBuilder.error(
          error.formatMessage(),
          error.context,
        );
      }

      if (error instanceof DatabaseError) {
        CloudLogger.error('Database error in pending notifications processing', {
          category: LogCategory.DATABASE,
          error: {
            details: error.message,
            recoverable: false,
          },
        });
        return HttpResponseBuilder.error(
          'Database operation failed',
          { operation: 'pending notifications processing' },
        );
      }

      const errorMessage = getErrorMessage(error);
      CloudLogger.critical('Unexpected error in NotificationBatchController (pending)', {
        category: LogCategory.NOTIFICATION,
        error: toErrorInfo(error, undefined, false),
      });
      return HttpResponseBuilder.error('Pending notifications processing failed', errorMessage);
    }
  }

  async handleCleanupExpiredNotifications(_req: Request): Promise<Response> {
    try {
      const input: BatchExecutionInput = { operation: 'cleanup_expired' };
      const result = await this.notificationBatchUseCase.execute(input);

      return HttpResponseBuilder.success({
        operation: result.operation,
        processed: result.processed,
        failed: result.failed,
        cleaned: result.cleaned,
        executionTimeMs: result.executionDurationMs,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        CloudLogger.error('Batch UseCase error in expired notifications cleanup', {
          category: LogCategory.NOTIFICATION,
          error: {
            details: error.message,
            recoverable: true,
          },
        });
        return HttpResponseBuilder.error(
          error.formatMessage(),
          error.context,
        );
      }

      if (error instanceof DatabaseError) {
        CloudLogger.error('Database error in expired notifications cleanup', {
          category: LogCategory.DATABASE,
          error: {
            details: error.message,
            recoverable: false,
          },
        });
        return HttpResponseBuilder.error(
          'Database operation failed',
          { operation: 'expired notifications cleanup' },
        );
      }

      const errorMessage = getErrorMessage(error);
      CloudLogger.critical('Unexpected error in NotificationBatchController (cleanup)', {
        category: LogCategory.NOTIFICATION,
        error: toErrorInfo(error, undefined, false),
      });
      return HttpResponseBuilder.error('Expired notifications cleanup failed', errorMessage);
    }
  }
}
