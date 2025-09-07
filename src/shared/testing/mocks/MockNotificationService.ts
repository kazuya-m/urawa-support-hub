import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import type { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';

export class MockNotificationService implements INotificationService {
  private processedNotifications: Array<{
    input?: NotificationExecutionInput;
    notification?: Notification;
    ticket?: Ticket;
  }> = [];
  private shouldThrowError = false;
  private errorMessage = 'Mock notification error';

  async processScheduledNotification(input: NotificationExecutionInput): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.processedNotifications.push({ input });
    await Promise.resolve();
  }

  async processPendingNotifications(): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    // Mock implementation - does nothing
    await Promise.resolve();
  }

  async sendNotification(history: Notification, ticket: Ticket): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.processedNotifications.push({ notification: history, ticket });
    await Promise.resolve();
  }

  // テスト用確認メソッド
  getProcessedNotifications(): Array<{
    input?: NotificationExecutionInput;
    notification?: Notification;
    ticket?: Ticket;
  }> {
    return [...this.processedNotifications];
  }

  // テスト用設定メソッド
  setShouldThrowError(shouldThrow: boolean, message = 'Mock notification error'): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  clear(): void {
    this.processedNotifications = [];
    this.shouldThrowError = false;
  }
}
