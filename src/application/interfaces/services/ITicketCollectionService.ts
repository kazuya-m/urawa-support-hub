import { Ticket } from '@/domain/entities/Ticket.ts';

export interface ITicketCollectionService {
  collectAllTickets(): Promise<Ticket[]>;
}
