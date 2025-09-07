import { Ticket } from '@/domain/entities/Ticket.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import { INotificationSchedulerService } from '@/application/interfaces/services/INotificationSchedulerService.ts';

export class MockNotificationSchedulerService implements INotificationSchedulerService {
  private scheduledNotifications: Array<{
    ticket: Ticket;
    scheduledTimes: NotificationTiming[];
  }> = [];
  private cancelledNotifications: string[] = [];
  private cancelledBatches: string[][] = [];
  private shouldThrowError = false;
  private errorMessage = 'Mock scheduler error';

  async scheduleNotifications(ticket: Ticket, scheduledTimes: NotificationTiming[]): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.scheduledNotifications.push({
      ticket,
      scheduledTimes,
    });
    await Promise.resolve();
  }

  async cancelNotification(taskId: string): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.cancelledNotifications.push(taskId);
    await Promise.resolve();
  }

  async cancelNotifications(taskIds: string[]): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.cancelledBatches.push([...taskIds]);
    this.cancelledNotifications.push(...taskIds);
    await Promise.resolve();
  }

  // テスト用確認メソッド
  getScheduledNotifications(): Array<{ ticket: Ticket; scheduledTimes: NotificationTiming[] }> {
    return [...this.scheduledNotifications];
  }

  getCancelledNotifications(): string[] {
    return [...this.cancelledNotifications];
  }

  getCancelledBatches(): string[][] {
    return [...this.cancelledBatches];
  }

  // テスト用設定メソッド
  setShouldThrowError(shouldThrow: boolean, message = 'Mock scheduler error'): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  clear(): void {
    this.scheduledNotifications = [];
    this.cancelledNotifications = [];
    this.cancelledBatches = [];
    this.shouldThrowError = false;
  }
}
