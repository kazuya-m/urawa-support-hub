import { INotificationUseCase } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import type { ErrorHandlingOptions } from '@/adapters/helpers/withErrorHandling.ts';
import { validateNotificationRequest } from '@/adapters/validators/NotificationRequestValidator.ts';
import { LogCategory } from '@/shared/logging/types.ts';

export const NOTIFICATION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in NotificationController',
  category: LogCategory.NOTIFICATION,
  severity: 'critical',
  unexpectedResponse: (errorMessage) => ['Internal Server Error', errorMessage],
};

export class NotificationController {
  constructor(
    private readonly notificationUseCase: INotificationUseCase,
  ) {}

  async handleSendNotification(req: Request): Promise<Response> {
    const body = await req.json().catch(() => null);
    const validation = validateNotificationRequest(body);

    if (!validation.isValid) {
      return HttpResponseBuilder.badRequest(validation.error!);
    }

    const result = await this.notificationUseCase.execute(validation.data!);

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
  }
}
