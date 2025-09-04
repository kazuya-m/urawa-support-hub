import { Ticket } from '@/domain/entities/Ticket.ts';

export interface TicketUpsertResult {
  isNew: boolean;
  hasChanged: boolean;
  ticket: Ticket;
  previousTicket?: Ticket;
}

export interface TicketCollectionResult {
  status: 'success' | 'error';
  ticketsFound: number;
  newTickets?: number;
  updatedTickets?: number;
  unchangedTickets?: number;
  executionDurationMs: number;
  errorDetails?: {
    message: string;
    stack?: string;
  };
  sourceResults?: unknown;
}

export interface NotificationResult {
  status: 'success' | 'error';
  ticketId: string;
  notificationType: string;
  executionDurationMs: number;
  errorMessage?: string;
}

export interface BatchProcessingResult {
  status: 'success' | 'error';
  operation: 'process_pending' | 'cleanup_expired';
  processed?: number;
  failed?: number;
  cleaned?: number;
  executionDurationMs: number;
  errorMessage?: string;
}
