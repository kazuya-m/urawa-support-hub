import {
  type NotificationExecutionInput,
  sendNotification,
  type SendNotificationDeps,
} from '@/usecases/sendNotification.ts';
import {
  isValidNotificationType,
  type NotificationType,
} from '@/domain/config/NotificationConfig.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import {
  badRequestResponse,
  type ErrorHandlingOptions,
  errorResponse,
  successResponse,
  withErrorHandling,
} from './http.ts';

const NOTIFICATION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in NotificationController',
  category: LogCategory.NOTIFICATION,
  severity: 'critical',
  unexpectedResponse: (errorMessage) => ['Internal Server Error', errorMessage],
};

interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

function validateNotificationRequest(
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

export function handleSendNotification(
  req: Request,
  deps: SendNotificationDeps,
): Promise<Response> {
  return withErrorHandling(async () => {
    const body = await req.json().catch(() => null);
    const validation = validateNotificationRequest(body);

    if (!validation.isValid) {
      return badRequestResponse(validation.error!);
    }

    const result = await sendNotification(deps, validation.data!);

    if (result.status === 'error') {
      return errorResponse('Notification processing failed', {
        ticketId: result.ticketId,
        notificationType: result.notificationType,
        errorMessage: result.errorMessage,
        executionTimeMs: result.executionDurationMs,
      });
    }

    return successResponse({
      message: 'Notification sent successfully',
      ticketId: result.ticketId,
      notificationType: result.notificationType,
      executionTimeMs: result.executionDurationMs,
    });
  }, NOTIFICATION_ERROR_OPTIONS);
}
