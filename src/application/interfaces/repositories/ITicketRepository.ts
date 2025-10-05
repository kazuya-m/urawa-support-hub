import { Ticket } from '@/domain/entities/Ticket.ts';

export interface ITicketRepository {
  findAll(): Promise<Ticket[]>;
  findById(id: string): Promise<Ticket | null>;
  findByIds(ids: string[]): Promise<Map<string, Ticket>>;
  findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<Ticket[]>;
  findByStatusIn(statuses: string[]): Promise<Ticket[]>;
  upsert(ticket: Ticket): Promise<Ticket>;
  upsertMany(tickets: Ticket[]): Promise<Ticket[]>;
}
