import { type HttpStatusCode, HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';
import { AppError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import type { LogCategory, LogContext } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export function jsonResponse(data: Record<string, unknown>, status: HttpStatusCode): Response {
  return new Response(
    JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function successResponse(data: Record<string, unknown>): Response {
  return jsonResponse({
    status: 'success',
    ...data,
  }, HttpStatusCodes.OK);
}

export function errorResponse(
  message: string,
  details?: unknown,
  status: HttpStatusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR,
): Response {
  const data: Record<string, unknown> = { error: message };
  if (details !== undefined) {
    data.details = details;
  }
  return jsonResponse(data, status);
}

export function badRequestResponse(details: string): Response {
  return errorResponse('Bad Request', details, HttpStatusCodes.BAD_REQUEST);
}

export interface ErrorHandlingOptions {
  logMessage: string;
  category: LogCategory;
  severity?: 'error' | 'critical';
  context?: LogContext;
  unexpectedResponse: (errorMessage: string) => [string, unknown];
}

export async function withErrorHandling(
  handle: () => Promise<Response>,
  options: ErrorHandlingOptions,
): Promise<Response> {
  try {
    return await handle();
  } catch (error) {
    if (error instanceof AppError) {
      CloudLogger.error(options.logMessage, {
        category: options.category,
        context: options.context,
        error: {
          details: error.message,
          recoverable: true,
        },
      });
      return errorResponse(error.formatMessage(), error.context);
    }

    CloudLogger[options.severity ?? 'error'](options.logMessage, {
      category: options.category,
      context: options.context,
      error: toErrorInfo(error, undefined, false),
    });
    const [message, details] = options.unexpectedResponse(getErrorMessage(error));
    return errorResponse(message, details);
  }
}
