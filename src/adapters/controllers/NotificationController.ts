import {
  INotificationUseCase,
  NotificationExecutionInput,
} from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { validateNotificationRequest } from '@/adapters/validators/NotificationRequestValidator.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';

export class NotificationController {
  constructor(
    private readonly notificationUseCase: INotificationUseCase,
  ) {}

  async handleSendNotification(req: Request): Promise<Response> {
    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) {
        CloudLogger.error('UseCase error in notification processing', {
          category: LogCategory.NOTIFICATION,
          error: {
            details: error.message,
            recoverable: true,
          },
        });
        return HttpResponseBuilder.error(
          error.formatMessage(),
          error.context,
        );
      }

      if (error instanceof DatabaseError) {
        CloudLogger.error('Database error in notification processing', {
          category: LogCategory.DATABASE,
          error: {
            details: error.message,
            recoverable: false,
          },
        });
        return HttpResponseBuilder.error(
          'Database operation failed',
          { operation: 'notification processing' },
        );
      }

      const errorMessage = getErrorMessage(error);
      CloudLogger.critical('Unexpected error in NotificationController', {
        category: LogCategory.NOTIFICATION,
        error: toErrorInfo(error, undefined, false),
      });
      return HttpResponseBuilder.error('Internal Server Error', errorMessage);
    }
  }

  private async parseRequestBody(req: Request): Promise<unknown> {
    try {
      return await req.json();
    } catch {
      return null;
    }
  }
}
