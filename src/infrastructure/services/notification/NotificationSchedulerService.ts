import { Ticket } from '@/domain/entities/Ticket.ts';
import { Notification } from '@/domain/entities/Notification.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import { CloudTasksClient, EnqueueTaskParams } from '@/infrastructure/clients/CloudTasksClient.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';

export class NotificationSchedulerService {
  private cloudTasksClient: CloudTasksClient;
  private notificationRepository: NotificationRepository;

  constructor() {
    this.cloudTasksClient = new CloudTasksClient();
    this.notificationRepository = new NotificationRepository();
  }

  async scheduleNotifications(ticket: Ticket, scheduledTimes: NotificationTiming[]): Promise<void> {
    const targetUrl = Deno.env.get('CLOUD_RUN_NOTIFICATION_URL');

    if (!targetUrl) {
      throw new Error('CLOUD_RUN_NOTIFICATION_URL environment variable is required');
    }

    const schedulingPromises = scheduledTimes.map(async ({ type, scheduledTime }) => {
      try {
        const enqueueParams: EnqueueTaskParams = {
          taskId: `${ticket.id}-${type}`,
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
          status: 'pending',
          cloudTaskId: taskId,
          createdAt: new Date(),
        });
        await this.notificationRepository.save(notification);

        return { type, taskId, success: true };
      } catch (error) {
        console.error(`[NotificationScheduler] Failed to schedule ${type} notification:`, error);
        return { type, error, success: false };
      }
    });

    const results = await Promise.all(schedulingPromises);

    const failures = results.filter((result) => !result.success);
    if (failures.length > 0) {
      console.warn(
        `[NotificationScheduler] ${failures.length} notifications failed to schedule for ticket ${ticket.id}`,
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
      console.error(`[NotificationScheduler] Failed to dequeue task ${taskId}:`, error);
      throw error;
    }
  }

  async cancelNotifications(taskIds: string[]): Promise<void> {
    const cancelPromises = taskIds.map(async (taskId) => {
      try {
        await this.cancelNotification(taskId);
        return { success: true, taskId };
      } catch (error) {
        console.error(`Failed to dequeue task ${taskId}:`, error);
        return { success: false, taskId, error };
      }
    });

    const results = await Promise.all(cancelPromises);
    const failures = results.filter((result) => !result.success);

    if (failures.length > 0) {
      console.warn(`[NotificationScheduler] ${failures.length} dequeue operations failed`);
      throw new Error(`${failures.length} out of ${taskIds.length} dequeue operations failed`);
    }
  }
}
