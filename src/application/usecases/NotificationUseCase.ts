import type { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import type {
  NotificationExecutionInput,
  NotificationResult,
} from '@/application/usecases/results.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class NotificationUseCase {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async execute(input: NotificationExecutionInput): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      await this.notificationService.sendScheduledNotification(input);

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
          stage: 'usecase_error',
        },
        metadata: {
          // NotificationService の metadata.notificationType は表示名なので、別のキーにする
          notificationTypeKey: input.notificationType,
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
