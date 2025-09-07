import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { BatchProcessingResult } from '@/application/types/UseCaseResults.ts';
import {
  BatchExecutionInput,
  INotificationBatchUseCase,
} from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';

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
      console.error('Batch notification operation failed:', {
        operation: input.operation,
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : String(error),
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
      // TODO: 期限切れ通知のクリーンアップロジック実装
      // 現時点では未実装のプレースホルダー
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
      console.error('Expired notifications cleanup failed:', {
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : String(error),
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
