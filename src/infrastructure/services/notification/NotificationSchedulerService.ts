import { Ticket } from '@/domain/entities/Ticket.ts';
import { Notification } from '@/domain/entities/Notification.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import {
  EnqueueTaskParams,
  ICloudTasksClient,
} from '@/application/interfaces/clients/ICloudTasksClient.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';
import { INotificationSchedulerService } from '@/application/interfaces/services/INotificationSchedulerService.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class NotificationSchedulerService implements INotificationSchedulerService {
  constructor(
    private readonly cloudTasksClient: ICloudTasksClient,
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async scheduleNotifications(ticket: Ticket, scheduledTimes: NotificationTiming[]): Promise<void> {
    const targetUrl = Deno.env.get('CLOUD_RUN_NOTIFICATION_URL');

    if (!targetUrl) {
      throw new Error('CLOUD_RUN_NOTIFICATION_URL environment variable is required');
    }

    const schedulingPromises = scheduledTimes.map(async ({ type, scheduledTime }) => {
      try {
        const enqueueParams: EnqueueTaskParams = {
          taskId: `${ticket.id}-${type}-${crypto.randomUUID()}`,
          payload: {
            ticketId: ticket.id,
            notificationType: type,
          },
          scheduledTime,
          targetUrl,
        };

        const taskId = await this.cloudTasksClient.enqueueTask(enqueueParams);

        const notification = new Notification({
          id: crypto.randomUUID(),
          ticketId: ticket.id,
          notificationType: type,
          scheduledAt: scheduledTime,
          sentAt: null,
          status: 'scheduled',
          errorMessage: null,
          cloudTaskId: taskId,
          createdAt: new Date(),
          updatedAt: null,
        });
        await this.notificationRepository.save(notification);

        return { type, taskId, success: true };
      } catch (error) {
        CloudLogger.error(`Failed to schedule ${type} notification`, {
          category: LogCategory.NOTIFICATION,
          context: { ticketId: ticket.id },
          error: toErrorInfo(error, undefined, true),
        });
        return { type, error, success: false };
      }
    });

    const results = await Promise.all(schedulingPromises);

    const failures = results.filter((result) => !result.success);
    if (failures.length > 0) {
      CloudLogger.warning(
        `${failures.length} notifications failed to schedule for ticket ${ticket.id}`,
        {
          category: LogCategory.NOTIFICATION,
          context: { ticketId: ticket.id },
          error: {
            details: `${failures.length} out of ${results.length} notifications failed`,
            recoverable: false,
          },
        },
      );
      throw new Error(
        `${failures.length} out of ${results.length} notifications failed to schedule`,
      );
    }
  }

  async cancelNotification(taskId: string): Promise<void> {
    try {
      await this.cloudTasksClient.dequeueTask(taskId);
    } catch (error) {
      CloudLogger.error(`Failed to dequeue task ${taskId}`, {
        category: LogCategory.NOTIFICATION,
        error: toErrorInfo(error, undefined, true),
      });
      throw error;
    }
  }

  async cancelNotifications(taskIds: string[]): Promise<void> {
    const cancelPromises = taskIds.map(async (taskId) => {
      try {
        await this.cancelNotification(taskId);
        return { success: true, taskId };
      } catch (error) {
        CloudLogger.error(`Failed to dequeue task ${taskId}`, {
          category: LogCategory.NOTIFICATION,
          error: toErrorInfo(error, undefined, true),
        });
        return { success: false, taskId, error };
      }
    });

    const results = await Promise.all(cancelPromises);
    const failures = results.filter((result) => !result.success);

    if (failures.length > 0) {
      CloudLogger.warning(`${failures.length} dequeue operations failed`, {
        category: LogCategory.NOTIFICATION,
        error: {
          details: `${failures.length} out of ${taskIds.length} operations failed`,
          recoverable: false,
        },
      });
      throw new Error(`${failures.length} out of ${taskIds.length} dequeue operations failed`);
    }
  }
}
