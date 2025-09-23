import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { NotificationResult } from '@/application/types/UseCaseResults.ts';
import {
  INotificationUseCase,
  NotificationExecutionInput,
} from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class NotificationUseCase implements INotificationUseCase {
  constructor(
    private readonly notificationService: INotificationService,
  ) {}

  async execute(input: NotificationExecutionInput): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      await this.notificationService.processScheduledNotification(input);

      const executionTime = Date.now() - startTime;

      return {
        status: 'success',
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionDurationMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      CloudLogger.error('Scheduled notification failed', {
        category: LogCategory.NOTIFICATION,
        context: {
          ticketId: input.ticketId,
          processingStage: input.notificationType,
        },
        error: toErrorInfo(error, undefined, true),
      });

      return {
        status: 'error',
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionDurationMs: executionTime,
        errorMessage: getErrorMessage(error),
      };
    }
  }
}
