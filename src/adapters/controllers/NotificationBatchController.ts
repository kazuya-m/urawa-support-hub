import {
  BatchExecutionInput,
  INotificationBatchUseCase,
} from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { AuthHelper } from '@/adapters/helpers/AuthHelper.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';

export class NotificationBatchController {
  constructor(
    private readonly notificationBatchUseCase: INotificationBatchUseCase,
  ) {}

  async handleProcessPendingNotifications(req: Request): Promise<Response> {
    try {
      if (!AuthHelper.validateCloudSchedulerRequest(req)) {
        return HttpResponseBuilder.unauthorized(
          'Invalid or missing authentication for Cloud Scheduler',
        );
      }

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

      // 予期しないエラー
      const errorMessage = error instanceof Error ? error.message : String(error);
      CloudLogger.critical('Unexpected error in NotificationBatchController (pending)', {
        category: LogCategory.NOTIFICATION,
        error: {
          details: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          recoverable: false,
        },
      });
      return HttpResponseBuilder.error('Pending notifications processing failed', errorMessage);
    }
  }

  async handleCleanupExpiredNotifications(req: Request): Promise<Response> {
    try {
      if (!AuthHelper.validateCloudSchedulerRequest(req)) {
        return HttpResponseBuilder.unauthorized(
          'Invalid or missing authentication for Cloud Scheduler',
        );
      }

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

      // 予期しないエラー
      const errorMessage = error instanceof Error ? error.message : String(error);
      CloudLogger.critical('Unexpected error in NotificationBatchController (cleanup)', {
        category: LogCategory.NOTIFICATION,
        error: {
          details: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          recoverable: false,
        },
      });
      return HttpResponseBuilder.error('Expired notifications cleanup failed', errorMessage);
    }
  }
}
