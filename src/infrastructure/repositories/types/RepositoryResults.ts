import { Ticket } from '@/domain/entities/Ticket.ts';

export interface UpsertResult {
  isNew: boolean;
  hasChanged: boolean;
  ticket: Ticket;
}
