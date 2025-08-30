import { NotificationBatchUseCase } from '@/application/usecases/NotificationBatchUseCase.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

interface ErrorResponse {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export class NotificationBatchController {
  private notificationBatchUseCase: NotificationBatchUseCase;

  constructor() {
    this.notificationBatchUseCase = new NotificationBatchUseCase();
  }

  async handleProcessPendingNotifications(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const isAuthenticated = this.validateCloudSchedulerRequest(req);
      if (!isAuthenticated) {
        return this.createErrorResponse(
          'Unauthorized',
          'Invalid or missing OIDC token from Cloud Scheduler',
          401,
        );
      }

      const result = await this.notificationBatchUseCase.executePendingNotifications();

      const executionTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Pending notifications processed successfully',
          processed: result.processed,
          failed: result.failed,
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('process pending notifications', error);
      }

      return this.createErrorResponse(
        'Pending notifications processing failed',
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  }

  async handleCleanupExpiredNotifications(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const isAuthenticated = this.validateCloudSchedulerRequest(req);
      if (!isAuthenticated) {
        return this.createErrorResponse(
          'Unauthorized',
          'Invalid or missing OIDC token from Cloud Scheduler',
          401,
        );
      }

      const result = await this.notificationBatchUseCase.cleanupExpiredNotifications();

      const executionTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Expired notifications cleaned up successfully',
          cleaned: result.cleaned,
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('cleanup expired notifications', error);
      }

      return this.createErrorResponse(
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

  private createErrorResponse(error: string, details: unknown, status: number): Response {
    const errorResponse: ErrorResponse = {
      error,
      details,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
