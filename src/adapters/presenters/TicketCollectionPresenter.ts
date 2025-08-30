import { TicketCollectionResult } from '@/application/types/UseCaseResults.ts';

interface SuccessResponseData {
  status: 'success';
  message: string;
  executionTimeMs: number;
  timestamp: string;
}

interface ErrorResponseData {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export class TicketCollectionPresenter {
  static toSuccessResponse(result: TicketCollectionResult): Response {
    const responseData: SuccessResponseData = {
      status: 'success',
      message: 'Ticket collection completed successfully',
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

  static toUnauthorizedResponse(message = 'Invalid or missing OIDC token'): Response {
    return this.toErrorResponse('Unauthorized', message, 401);
  }
}
