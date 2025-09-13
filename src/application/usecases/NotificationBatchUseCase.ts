import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { BatchProcessingResult } from '@/application/types/UseCaseResults.ts';
import {
  BatchExecutionInput,
  INotificationBatchUseCase,
} from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';

export class NotificationBatchUseCase implements INotificationBatchUseCase {
  constructor(
    private readonly notificationService: INotificationService,
  ) {}

  async execute(input: BatchExecutionInput): Promise<BatchProcessingResult> {
    const startTime = Date.now();

    try {
      switch (input.operation) {
        case 'process_pending':
          return await this.executePendingNotifications(startTime);
        case 'cleanup_expired':
          return await this.cleanupExpiredNotifications(startTime);
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      CloudLogger.error('Batch notification operation failed', {
        category: LogCategory.NOTIFICATION,
        context: {
          processingStage: input.operation,
        },
        metrics: {
          totalProcessed: 0,
          successCount: 0,
          failureCount: 1,
          unknownPatterns: 0,
          processingTimeMs: executionTime,
        },
        error: {
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          recoverable: true,
        },
      });

      if (error instanceof Error && error.message.startsWith('Unknown operation:')) {
        throw error;
      }
      throw new Error(
        `Failed to execute batch notifications: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async executePendingNotifications(startTime: number): Promise<BatchProcessingResult> {
    let processed = 0;
    const failed = 0;

    await this.notificationService.processPendingNotifications();

    processed = 1;

    const executionTime = Date.now() - startTime;

    return {
      status: 'success',
      operation: 'process_pending',
      processed,
      failed,
      executionDurationMs: executionTime,
    };
  }

  private cleanupExpiredNotifications(startTime: number): Promise<BatchProcessingResult> {
    try {
      // 期限切れ通知のクリーンアップ（現在は未実装）
      const cleaned = 0;

      const executionTime = Date.now() - startTime;

      return Promise.resolve({
        status: 'success',
        operation: 'cleanup_expired',
        cleaned,
        executionDurationMs: executionTime,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      CloudLogger.error('Expired notifications cleanup failed', {
        category: LogCategory.NOTIFICATION,
        context: {
          processingStage: 'cleanup_expired',
        },
        error: {
          details: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          recoverable: true,
        },
      });

      return Promise.resolve({
        status: 'error',
        operation: 'cleanup_expired',
        cleaned: 0,
        executionDurationMs: executionTime,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
