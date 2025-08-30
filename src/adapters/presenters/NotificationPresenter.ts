import { NotificationResult } from '@/application/types/UseCaseResults.ts';

interface SuccessResponseData {
  status: 'success';
  message: string;
  ticketId: string;
  notificationType: string;
  executionTimeMs: number;
  timestamp: string;
}

interface ErrorResponseData {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export class NotificationPresenter {
  static toSuccessResponse(result: NotificationResult): Response {
    const responseData: SuccessResponseData = {
      status: 'success',
      message: 'Notification sent successfully',
      ticketId: result.ticketId,
      notificationType: result.notificationType,
      executionTimeMs: result.executionDurationMs,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static toErrorResponse(
    error: string,
    details: unknown = null,
    statusCode = 500,
  ): Response {
    const responseData: ErrorResponseData = {
      error,
      details,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static toUnauthorizedResponse(
    message = 'Invalid or missing authentication for Cloud Tasks',
  ): Response {
    return this.toErrorResponse('Unauthorized', message, 401);
  }

  static toBadRequestResponse(message: string): Response {
    return this.toErrorResponse('Bad Request', message, 400);
  }
}
