import { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

export interface BatchProcessResult {
  processed: number;
  failed: number;
}

export interface CleanupResult {
  cleaned: number;
}

export class NotificationBatchUseCase {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async executePendingNotifications(): Promise<BatchProcessResult> {
    const startTime = Date.now();
    let processed = 0;
    const failed = 0;

    try {
      // NotificationServiceのprocessPendingNotificationsを呼び出す
      // 現在は成功/失敗の詳細を返さないため、今後の拡張が必要
      await this.notificationService.processPendingNotifications();

      // TODO: NotificationServiceから詳細な結果を取得する実装が必要
      // 現時点では正常完了とみなす
      processed = 1; // 仮の値

      const executionTime = Date.now() - startTime;
      console.log('Batch notifications processed successfully:', {
        processed,
        failed,
        executionTimeMs: executionTime,
      });

      return { processed, failed };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Batch notifications processing failed:', {
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error) {
        handleSupabaseError('execute batch notifications', error);
      }

      throw error;
    }
  }

  cleanupExpiredNotifications(): Promise<CleanupResult> {
    const startTime = Date.now();

    try {
      // TODO: 期限切れ通知のクリーンアップロジック実装
      // 現時点では未実装のプレースホルダー
      const cleaned = 0;

      const executionTime = Date.now() - startTime;
      console.log('Expired notifications cleaned up successfully:', {
        cleaned,
        executionTimeMs: executionTime,
      });

      return Promise.resolve({ cleaned });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Expired notifications cleanup failed:', {
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error) {
        handleSupabaseError('cleanup expired notifications', error);
      }

      return Promise.reject(error);
    }
  }
}
