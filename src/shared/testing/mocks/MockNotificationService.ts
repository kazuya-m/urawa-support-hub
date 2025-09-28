import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import type { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';

export class MockNotificationService implements INotificationService {
  private processedNotifications: Array<{
    input?: NotificationExecutionInput;
    notification?: Notification;
    ticket?: Ticket;
    tickets?: Ticket[];
  }> = [];
  private shouldThrowError = false;
  private errorMessage = 'Mock notification error';

  async sendScheduledNotification(input: NotificationExecutionInput): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.processedNotifications.push({ input });
    await Promise.resolve();
  }

  async sendTicketSummary(tickets: Ticket[]): Promise<void> {
    // Always count the call, even if it will throw an error
    this.processedNotifications.push({ tickets });

    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    await Promise.resolve();
  }

  // テスト用確認メソッド
  getProcessedNotifications(): Array<{
    input?: NotificationExecutionInput;
    notification?: Notification;
    ticket?: Ticket;
    tickets?: Ticket[];
  }> {
    return [...this.processedNotifications];
  }

  getLastSentTickets(): Ticket[] | undefined {
    const lastSummary = this.processedNotifications
      .filter((p) => p.tickets)
      .pop();
    return lastSummary?.tickets;
  }

  getSendTicketSummaryCallCount(): number {
    return this.processedNotifications.filter((p) => p.tickets).length;
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
