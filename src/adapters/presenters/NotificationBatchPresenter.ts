import { BatchProcessingResult } from '@/application/types/UseCaseResults.ts';

interface ProcessingSuccessResponseData {
  status: 'success';
  message: string;
  processed: number;
  failed: number;
  executionTimeMs: number;
  timestamp: string;
}

interface CleanupSuccessResponseData {
  status: 'success';
  message: string;
  cleaned: number;
  executionTimeMs: number;
  timestamp: string;
}

interface ErrorResponseData {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export class NotificationBatchPresenter {
  static toProcessingSuccessResponse(result: BatchProcessingResult): Response {
    const responseData: ProcessingSuccessResponseData = {
      status: 'success',
      message: 'Pending notifications processed successfully',
      processed: result.processed || 0,
      failed: result.failed || 0,
      executionTimeMs: result.executionDurationMs,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static toCleanupSuccessResponse(result: BatchProcessingResult): Response {
    const responseData: CleanupSuccessResponseData = {
      status: 'success',
      message: 'Expired notifications cleaned up successfully',
      cleaned: result.cleaned || 0,
      executionTimeMs: result.executionDurationMs,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static toSuccessResponse(result: BatchProcessingResult): Response {
    switch (result.operation) {
      case 'process_pending':
        return this.toProcessingSuccessResponse(result);
      case 'cleanup_expired':
        return this.toCleanupSuccessResponse(result);
      default:
        throw new Error(`Unknown operation: ${result.operation}`);
    }
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
    message = 'Invalid or missing OIDC token from Cloud Scheduler',
  ): Response {
    return this.toErrorResponse('Unauthorized', message, 401);
  }
}
