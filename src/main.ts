import { load } from '@std/dotenv';
import {
  collectTickets,
  type CollectTicketsDeps,
  createCollectTicketsDeps,
} from '@/usecases/collectTickets.ts';
import {
  createSendNotificationDeps,
  type NotificationExecutionInput,
  sendNotification,
  type SendNotificationDeps,
} from '@/usecases/sendNotification.ts';
import {
  createSendSummaryDeps,
  sendSummary,
  type SendSummaryDeps,
} from '@/usecases/sendSummary.ts';
import { handleHealthCheck } from '@/middleware/health.ts';
import { type HttpStatusCode, HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';
import { AppError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory, type LogContext } from '@/shared/logging/types.ts';
import {
  isValidNotificationType,
  type NotificationType,
} from '@/domain/config/NotificationConfig.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

class HttpResponseBuilder {
  static json(data: Record<string, unknown>, status: HttpStatusCode): Response {
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

  static success(data: Record<string, unknown>): Response {
    return this.json({
      status: 'success',
      ...data,
    }, HttpStatusCodes.OK);
  }

  static error(
    message: string,
    details?: unknown,
    status: HttpStatusCode = HttpStatusCodes.INTERNAL_SERVER_ERROR,
  ): Response {
    const data: Record<string, unknown> = { error: message };
    if (details !== undefined) {
      data.details = details;
    }
    return this.json(data, status);
  }

  static badRequest(details: string): Response {
    return this.error('Bad Request', details, HttpStatusCodes.BAD_REQUEST);
  }
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
      return HttpResponseBuilder.error(error.formatMessage(), error.context);
    }

    CloudLogger[options.severity ?? 'error'](options.logMessage, {
      category: options.category,
      context: options.context,
      error: toErrorInfo(error, undefined, false),
    });
    const [message, details] = options.unexpectedResponse(getErrorMessage(error));
    return HttpResponseBuilder.error(message, details);
  }
}

export const TICKET_COLLECTION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'UseCase error in ticket collection',
  category: LogCategory.TICKET_COLLECTION,
  unexpectedResponse: (errorMessage) => ['Ticket collection failed', errorMessage],
};

export const NOTIFICATION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in NotificationController',
  category: LogCategory.NOTIFICATION,
  severity: 'critical',
  unexpectedResponse: (errorMessage) => ['Internal Server Error', errorMessage],
};

export const TICKET_SUMMARY_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in ticket summary processing',
  category: LogCategory.NOTIFICATION,
  context: { stage: 'TicketSummaryController' },
  unexpectedResponse: (errorMessage) => [
    'Internal server error during ticket summary processing',
    { errorType: 'UnknownError', errorMessage },
  ],
};

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

export function validateNotificationRequest(
  body: unknown,
): ValidationResult<NotificationExecutionInput> {
  if (!body || typeof body !== 'object' || body === null) {
    return {
      isValid: false,
      error: 'Invalid request body format',
    };
  }

  const requestBody = body as Record<string, unknown>;
  const { ticketId, notificationType } = requestBody;

  if (!ticketId || typeof ticketId !== 'string') {
    return {
      isValid: false,
      error: 'ticketId is required and must be a string',
    };
  }

  if (!isValidNotificationType(notificationType as string)) {
    return {
      isValid: false,
      error: `Invalid notificationType: ${String(notificationType)}`,
    };
  }

  return {
    isValid: true,
    data: {
      ticketId,
      notificationType: notificationType as NotificationType,
    },
  };
}

export interface RouteFactories {
  collectTickets: () => Promise<CollectTicketsDeps>;
  sendNotification: () => SendNotificationDeps;
  ticketSummary: () => SendSummaryDeps;
}

const defaultRouteFactories: RouteFactories = {
  collectTickets: createCollectTicketsDeps,
  sendNotification: createSendNotificationDeps,
  ticketSummary: createSendSummaryDeps,
};

export async function handleRequest(
  req: Request,
  factories: RouteFactories = defaultRouteFactories,
): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/api/collect-tickets' && req.method === 'POST') {
    const deps = await factories.collectTickets();
    return await withErrorHandling(async () => {
      const result = await collectTickets(deps);

      return HttpResponseBuilder.success({
        message: 'Ticket collection completed successfully',
        ticketsFound: result.ticketsFound,
        newTickets: result.newTickets,
        updatedTickets: result.updatedTickets,
        executionTimeMs: result.executionDurationMs,
      });
    }, TICKET_COLLECTION_ERROR_OPTIONS);
  }

  if (url.pathname === '/api/send-notification' && req.method === 'POST') {
    const deps = factories.sendNotification();
    return await withErrorHandling(async () => {
      const body = await req.json().catch(() => null);
      const validation = validateNotificationRequest(body);

      if (!validation.isValid) {
        return HttpResponseBuilder.badRequest(validation.error!);
      }

      const result = await sendNotification(deps, validation.data!);

      if (result.status === 'error') {
        return HttpResponseBuilder.error('Notification processing failed', {
          ticketId: result.ticketId,
          notificationType: result.notificationType,
          errorMessage: result.errorMessage,
          executionTimeMs: result.executionDurationMs,
        });
      }

      return HttpResponseBuilder.success({
        message: 'Notification sent successfully',
        ticketId: result.ticketId,
        notificationType: result.notificationType,
        executionTimeMs: result.executionDurationMs,
      });
    }, NOTIFICATION_ERROR_OPTIONS);
  }

  if (url.pathname === '/api/ticket-summary' && req.method === 'POST') {
    const deps = factories.ticketSummary();
    return await withErrorHandling(async () => {
      await sendSummary(deps);
      return HttpResponseBuilder.success({
        message: 'Ticket summary processed successfully',
        timestamp: new Date().toISOString(),
      });
    }, TICKET_SUMMARY_ERROR_OPTIONS);
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    return handleHealthCheck();
  }

  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: `${req.method} ${url.pathname} is not supported`,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function main(): void {
  const port = parseInt(Deno.env.get('PORT') || '8080');

  Deno.serve({
    port,
  }, (req) => handleRequest(req));
}

if (import.meta.main) {
  await load({ export: true }).catch(() => ({}));
  main();
}
