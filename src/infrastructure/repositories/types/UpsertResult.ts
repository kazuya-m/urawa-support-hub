import { Ticket } from '@/domain/entities/Ticket.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';

export interface UpsertResult {
  ticket: Ticket;
  isNew: boolean;
  hasChanged: boolean;
  previousSaleStatus?: SaleStatus;
}
