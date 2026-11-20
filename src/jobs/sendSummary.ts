import type { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { getAppConfig } from '@/config/app-config.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { ErrorCodes } from '@/shared/errors/ErrorCodes.ts';

export interface SendSummaryDeps {
  ticketRepository: Pick<TicketRepository, 'findByStatusIn'>;
  lineClient: Pick<LineClient, 'broadcast'>;
}

export function createSendSummaryDeps(): SendSummaryDeps {
  const config = getAppConfig();
  return {
    ticketRepository: new TicketRepository(getSupabaseAdminClient()),
    lineClient: new LineClient(config.line),
  };
}

export async function sendSummary(deps: SendSummaryDeps, now: Date = new Date()): Promise<void> {
  const startTime = Date.now();

  try {
    const targetTickets = await deps.ticketRepository.findByStatusIn(['on_sale', 'before_sale']);

    const upcomingTickets = targetTickets.filter((ticket) => ticket.matchDate >= now);

    if (upcomingTickets.length === 0) {
      CloudLogger.info('No upcoming tickets found, skipping LINE notification', {
        category: LogCategory.NOTIFICATION,
        context: { stage: 'no_tickets_skip' },
        metrics: {
          totalProcessed: targetTickets.length,
          successCount: 0,
          failureCount: 0,
          processingTimeMs: Date.now() - startTime,
        },
      });
      return;
    }

    await broadcastSummary(deps.lineClient, upcomingTickets);

    CloudLogger.info('Ticket summary sent successfully', {
      category: LogCategory.NOTIFICATION,
      context: { stage: 'usecase_completion' },
      metrics: {
        totalProcessed: upcomingTickets.length,
        successCount: 1,
        failureCount: 0,
        processingTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    CloudLogger.error('Ticket summary notification failed', {
      category: LogCategory.NOTIFICATION,
      context: {
        stage: 'usecase_error',
      },
      error: toErrorInfo(error, ErrorCodes.TICKET_SUMMARY_ERROR, false),
    });
    throw new Error(`Ticket summary notification failed: ${getErrorMessage(error)}`);
  }
}

async function broadcastSummary(
  lineClient: SendSummaryDeps['lineClient'],
  tickets: Ticket[],
): Promise<void> {
  const message = LINE_MESSAGE_TEMPLATES.ticketSummary(tickets);

  try {
    await lineClient.broadcast(message);

    CloudLogger.info('Ticket summary notification sent successfully', {
      category: LogCategory.NOTIFICATION,
      context: { stage: 'ticket_summary_sent' },
      metadata: {
        ticketCount: tickets.length,
      },
    });
  } catch (error) {
    CloudLogger.error('Ticket summary notification failed', {
      category: LogCategory.NOTIFICATION,
      context: { stage: 'ticket_summary_error' },
      error: toErrorInfo(error, ErrorCodes.TICKET_SUMMARY_ERROR, false),
    });
    throw new Error(`Ticket summary notification failed: ${getErrorMessage(error)}`);
  }
}
