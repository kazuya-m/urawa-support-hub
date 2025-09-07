import { Ticket } from '@/domain/entities/Ticket.ts';

export interface ITicketRepository {
  findAll(): Promise<Ticket[]>;
  findById(id: string): Promise<Ticket | null>;
  findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<Ticket[]>;
  upsert(ticket: Ticket): Promise<Ticket>;
}
