import { isValidNotificationType, NotificationType } from '@/domain/config/NotificationConfig.ts';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

export interface NotificationRequestData {
  ticketId: string;
  notificationType: NotificationType;
}

export function validateNotificationRequest(
  body: unknown,
): ValidationResult<NotificationRequestData> {
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
