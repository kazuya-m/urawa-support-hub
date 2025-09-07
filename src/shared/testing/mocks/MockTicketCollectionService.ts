import { Ticket } from '@/domain/entities/Ticket.ts';
import { ITicketCollectionService } from '@/application/interfaces/services/ITicketCollectionService.ts';

export class MockTicketCollectionService implements ITicketCollectionService {
  private mockTickets: Ticket[] = [];
  private shouldThrowError = false;
  private errorMessage = 'Mock error';

  async collectAllTickets(): Promise<Ticket[]> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }
    await Promise.resolve();
    return [...this.mockTickets]; // コピーを返す
  }

  // テスト用設定メソッド
  setMockTickets(tickets: Ticket[]): void {
    this.mockTickets = [...tickets];
  }

  setShouldThrowError(shouldThrow: boolean, message = 'Mock error'): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  clear(): void {
    this.mockTickets = [];
    this.shouldThrowError = false;
  }
}
