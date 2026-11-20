import {
  type NotificationExecutionInput,
  sendNotification,
  type SendNotificationDeps,
} from '@/usecases/sendNotification.ts';
import { isValidNotificationType } from '@/domain/config/NotificationConfig.ts';
import { HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';
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

  if (!isValidNotificationType(notificationType)) {
    return {
      isValid: false,
      error: `Invalid notificationType: ${JSON.stringify(notificationType)}`,
    };
  }

  return {
    isValid: true,
    data: {
      ticketId,
      notificationType,
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

    const input = validation.data!;
    const outcome = await sendNotification(deps, input);

    if (outcome.kind === 'retry') {
      return errorResponse('Notification will be retried', {
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        reason: outcome.reason,
      }, HttpStatusCodes.SERVICE_UNAVAILABLE);
    }

    return successResponse({
      ticketId: input.ticketId,
      notificationType: input.notificationType,
      outcome,
    });
  }, NOTIFICATION_ERROR_OPTIONS);
}
