import { Ticket } from '@/domain/entities/Ticket.ts';

export interface UpsertResult {
  ticket: Ticket;
  isNew: boolean;
  hasChanged: boolean;
  previousSaleStatus?: 'before_sale' | 'on_sale' | 'ended';
}
