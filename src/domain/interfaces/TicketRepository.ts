import { Ticket } from '../entities/Ticket.ts';

export interface TicketRepository {
  findAll(): Promise<Ticket[]>;
  findById(id: string): Promise<Ticket | null>;
  findByColumn(column: string, value: unknown): Promise<Ticket[]>;
  findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<Ticket[]>;
  save(ticket: Ticket): Promise<void>;
  update(ticket: Ticket): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByDateRange(column: string, beforeDate: Date): Promise<void>;
}
