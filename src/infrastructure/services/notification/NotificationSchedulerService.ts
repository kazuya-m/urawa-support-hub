import type { UpcomingNotification } from '@/domain/notification.ts';
import type { CloudTasksClient, EnqueueResult } from '@/infrastructure/clients/CloudTasksClient.ts';

export class NotificationSchedulerService {
  constructor(
    private readonly cloudTasksClient: Pick<CloudTasksClient, 'enqueueTask'>,
    private readonly targetUrl: string,
  ) {}

  scheduleNotification(notification: UpcomingNotification): Promise<EnqueueResult> {
    if (!this.targetUrl) {
      return Promise.reject(
        new Error('CLOUD_RUN_NOTIFICATION_URL environment variable is required'),
      );
    }
    const { ticketId, notificationType, notificationTime } = notification;
    return this.cloudTasksClient.enqueueTask({
      taskId: `${ticketId}-${notificationType}-${Math.floor(notificationTime.getTime() / 1000)}`,
      payload: {
        ticketId,
        notificationType,
        notificationTime: notificationTime.toISOString(),
      },
      scheduledTime: notificationTime,
      targetUrl: this.targetUrl,
    });
  }
}
