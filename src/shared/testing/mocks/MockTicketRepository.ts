import { Ticket } from '@/domain/entities/Ticket.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';

export class MockTicketRepository implements ITicketRepository {
  private tickets: Map<string, Ticket> = new Map();

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
}
