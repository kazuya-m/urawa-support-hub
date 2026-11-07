import {
  INotificationUseCase,
  NotificationExecutionInput,
} from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { validateNotificationRequest } from '@/adapters/validators/NotificationRequestValidator.ts';

export class NotificationController {
  constructor(
    private readonly notificationUseCase: INotificationUseCase,
  ) {}

  async handleSendNotification(req: Request): Promise<Response> {
    const body = await this.parseRequestBody(req);
    const validation = validateNotificationRequest(body);

    if (!validation.isValid) {
      return HttpResponseBuilder.badRequest(validation.error!);
    }

    const inputData: NotificationExecutionInput = validation.data!;

    const result = await this.notificationUseCase.execute(inputData);

    if (result.status === 'error') {
      return HttpResponseBuilder.error(
        'Notification processing failed',
        {
          ticketId: result.ticketId,
          notificationType: result.notificationType,
          errorMessage: result.errorMessage,
          executionTimeMs: result.executionDurationMs,
        },
      );
    }

    return HttpResponseBuilder.success({
      message: 'Notification sent successfully',
      ticketId: result.ticketId,
      notificationType: result.notificationType,
      executionTimeMs: result.executionDurationMs,
    });
  }

  private async parseRequestBody(req: Request): Promise<unknown> {
    try {
      return await req.json();
    } catch {
      return null;
    }
  }
}
