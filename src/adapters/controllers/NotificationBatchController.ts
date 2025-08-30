import {
  BatchExecutionInput,
  NotificationBatchUseCase,
} from '@/application/usecases/NotificationBatchUseCase.ts';
import { NotificationBatchPresenter } from '@/adapters/presenters/NotificationBatchPresenter.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

export class NotificationBatchController {
  private notificationBatchUseCase: NotificationBatchUseCase;

  constructor() {
    this.notificationBatchUseCase = new NotificationBatchUseCase();
  }

  async handleProcessPendingNotifications(req: Request): Promise<Response> {
    try {
      const isAuthenticated = this.validateCloudSchedulerRequest(req);
      if (!isAuthenticated) {
        return NotificationBatchPresenter.toUnauthorizedResponse();
      }

      const input: BatchExecutionInput = { operation: 'process_pending' };
      const result = await this.notificationBatchUseCase.execute(input);
      return NotificationBatchPresenter.toSuccessResponse(result);
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('process pending notifications', error);
      }

      return NotificationBatchPresenter.toErrorResponse(
        'Pending notifications processing failed',
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  }

  async handleCleanupExpiredNotifications(req: Request): Promise<Response> {
    try {
      const isAuthenticated = this.validateCloudSchedulerRequest(req);
      if (!isAuthenticated) {
        return NotificationBatchPresenter.toUnauthorizedResponse();
      }

      const input: BatchExecutionInput = { operation: 'cleanup_expired' };
      const result = await this.notificationBatchUseCase.execute(input);
      return NotificationBatchPresenter.toSuccessResponse(result);
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('cleanup expired notifications', error);
      }

      return NotificationBatchPresenter.toErrorResponse(
        'Expired notifications cleanup failed',
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  }

  private validateCloudSchedulerRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization');

    // 開発環境では認証をスキップ
    if (Deno.env.get('NODE_ENV') !== 'production') {
      return true;
    }

    // Cloud Scheduler uses OIDC token authentication
    return !!authHeader && authHeader.startsWith('Bearer ');
  }
}
