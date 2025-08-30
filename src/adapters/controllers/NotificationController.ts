import {
  NotificationExecutionInput,
  NotificationUseCase,
} from '@/application/usecases/NotificationUseCase.ts';
import { isValidNotificationType, NotificationType } from '@/domain/entities/NotificationTypes.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

interface CloudTaskRequestBody {
  ticketId: string;
  notificationType: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export class NotificationController {
  private notificationUseCase: NotificationUseCase;

  constructor() {
    this.notificationUseCase = new NotificationUseCase();
  }

  async handleSendNotification(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const isAuthenticated = this.validateCloudTasksRequest(req);
      if (!isAuthenticated) {
        return this.createErrorResponse(
          'Unauthorized',
          'Invalid or missing authentication for Cloud Tasks',
          401,
        );
      }

      const requestBody = await this.parseRequestBody(req);
      if (!requestBody) {
        return this.createErrorResponse(
          'Bad Request',
          'Invalid request body format',
          400,
        );
      }

      const { ticketId, notificationType } = requestBody;

      if (!ticketId || typeof ticketId !== 'string') {
        return this.createErrorResponse(
          'Bad Request',
          'ticketId is required and must be a string',
          400,
        );
      }

      if (!isValidNotificationType(notificationType)) {
        return this.createErrorResponse(
          'Bad Request',
          `Invalid notificationType: ${notificationType}`,
          400,
        );
      }

      const inputData: NotificationExecutionInput = {
        ticketId,
        notificationType: notificationType as NotificationType,
      };

      await this.notificationUseCase.execute(inputData);

      const executionTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Notification sent successfully',
          ticketId,
          notificationType,
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
        handleSupabaseError('send notification', error);
      }

      return this.createErrorResponse(
        'Notification delivery failed',
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  }

  private validateCloudTasksRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization');

    if (Deno.env.get('NODE_ENV') !== 'production') {
      return true;
    }

    // Cloud Tasks uses OIDC token or service account authentication
    return !!authHeader && (
      authHeader.startsWith('Bearer ') ||
      authHeader.startsWith('OAuth ')
    );
  }

  private async parseRequestBody(req: Request): Promise<CloudTaskRequestBody | null> {
    try {
      const body = await req.json();
      return body as CloudTaskRequestBody;
    } catch {
      return null;
    }
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
