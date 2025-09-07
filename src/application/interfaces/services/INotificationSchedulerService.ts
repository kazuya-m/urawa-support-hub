import { Ticket } from '@/domain/entities/Ticket.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';

export interface INotificationSchedulerService {
  scheduleNotifications(ticket: Ticket, scheduledTimes: NotificationTiming[]): Promise<void>;
  cancelNotification(taskId: string): Promise<void>;
  cancelNotifications(taskIds: string[]): Promise<void>;
}
