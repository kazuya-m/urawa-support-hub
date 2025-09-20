import { Ticket } from '@/domain/entities/Ticket.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';

export class MockTicketRepository implements ITicketRepository {
  private tickets: Map<string, Ticket> = new Map();

  // findByStatusIn用のモック設定
  public findByStatusInCallCount = 0;
  public lastFindByStatusInArgs: string[] | null = null;
  private mockFindByStatusInResult: Ticket[] = [];
  private mockFindByStatusInError: Error | null = null;

  async findAll(): Promise<Ticket[]> {
    await Promise.resolve();
    return Array.from(this.tickets.values());
  }

  async findById(id: string): Promise<Ticket | null> {
    await Promise.resolve();
    return this.tickets.get(id) || null;
  }

  async findByDateRange(): Promise<Ticket[]> {
    await Promise.resolve();
    return Array.from(this.tickets.values());
  }

  async findByStatusIn(statuses: string[]): Promise<Ticket[]> {
    this.findByStatusInCallCount++;
    this.lastFindByStatusInArgs = statuses;

    if (this.mockFindByStatusInError) {
      throw this.mockFindByStatusInError;
    }

    await Promise.resolve();
    return this.mockFindByStatusInResult;
  }

  async upsert(ticket: Ticket): Promise<Ticket> {
    this.tickets.set(ticket.id, ticket);
    await Promise.resolve();
    return ticket;
  }

  // テスト用ヘルパーメソッド
  clear(): void {
    this.tickets.clear();
  }

  setTickets(tickets: Ticket[]): void {
    this.tickets.clear();
    tickets.forEach((ticket) => this.tickets.set(ticket.id, ticket));
  }

  mockFindByStatusIn(result: Ticket[]): void {
    this.mockFindByStatusInResult = result;
    this.mockFindByStatusInError = null;
  }

  setFindByStatusInError(error: Error): void {
    this.mockFindByStatusInError = error;
    this.mockFindByStatusInResult = [];
  }

  resetMocks(): void {
    this.findByStatusInCallCount = 0;
    this.lastFindByStatusInArgs = null;
    this.mockFindByStatusInResult = [];
    this.mockFindByStatusInError = null;
  }
}
