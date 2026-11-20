import { Ticket } from '@/domain/entities/Ticket.ts';
import { listUpcomingNotifications } from '@/domain/notification.ts';
import type { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import type { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import type { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { AppError, DatabaseError } from '@/shared/errors/index.ts';
import { ErrorCodes } from '@/shared/errors/ErrorCodes.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export interface TicketUpsertResult {
  ticket: Ticket;
  previousTicket: Ticket | null;
  hasChanges: boolean;
  error?: string;
}

export interface TicketCollectionResult {
  status: 'success' | 'error';
  ticketsFound: number;
  newTickets?: number;
  updatedTickets?: number;
  unchangedTickets?: number;
  failedTickets?: number;
  executionDurationMs: number;
  errorDetails?: {
    message: string;
    stack?: string;
  };
  sourceResults?: unknown;
  scheduledNotifications: NotificationSchedulingSummary;
}

export interface NotificationSchedulingSummary {
  created: number;
  alreadyExists: number;
  failed: number;
}

export interface CollectTicketsDeps {
  ticketCollectionService: Pick<TicketCollectionService, 'collectAllTickets'>;
  ticketRepository: Pick<
    TicketRepository,
    'findByIds' | 'upsertMany' | 'upsert' | 'findByStatusIn'
  >;
  notificationSchedulerService: Pick<NotificationSchedulerService, 'scheduleNotification'>;
  now: () => Date;
}

export async function collectTickets(
  deps: CollectTicketsDeps,
): Promise<TicketCollectionResult> {
  const startTime = Date.now();
  const sessionId = crypto.randomUUID();

  try {
    await scheduleUpcomingNotifications(deps, sessionId, 'before_collection');
  } catch (error) {
    CloudLogger.warning('Failed to schedule notifications before collection', {
      category: LogCategory.NOTIFICATION,
      context: { sessionId, stage: 'before_collection' },
      error: toErrorInfo(error, undefined, true),
    });
  }

  let collected: { tickets: Ticket[]; upsertResults: TicketUpsertResult[] } | null = null;
  let collectionError: unknown = null;
  try {
    const tickets = await deps.ticketCollectionService.collectAllTickets();
    const upsertResults = await upsertCollectedTickets(deps, tickets);
    collected = { tickets, upsertResults };
  } catch (error) {
    collectionError = error;
  }

  let scheduledNotifications: NotificationSchedulingSummary;
  try {
    scheduledNotifications = await scheduleUpcomingNotifications(
      deps,
      sessionId,
      'after_collection',
    );
  } catch (error) {
    CloudLogger.error('Failed to schedule notifications', {
      category: LogCategory.NOTIFICATION,
      context: { sessionId, stage: 'after_collection' },
      error: toErrorInfo(error, undefined, true),
    });
    throw toCollectionError(collectionError ?? error, sessionId, startTime);
  }

  if (!collected) {
    throw toCollectionError(collectionError, sessionId, startTime);
  }
  if (scheduledNotifications.failed > 0) {
    throw toCollectionError(
      new Error(`${scheduledNotifications.failed} notifications failed to schedule`),
      sessionId,
      startTime,
    );
  }

  const { tickets, upsertResults } = collected;
  const executionDuration = Date.now() - startTime;

  const statistics = calculateStatistics(upsertResults);

  const summaryMessage =
    `Ticket collection completed: ${statistics.newTickets} new, ${statistics.updatedTickets} updated, ${statistics.unchangedTickets} unchanged, ${statistics.failedTickets} failed`;

  CloudLogger.info(summaryMessage, {
    category: LogCategory.TICKET_COLLECTION,
    metrics: {
      totalProcessed: tickets.length,
      successCount: statistics.newTickets + statistics.updatedTickets +
        statistics.unchangedTickets,
      failureCount: statistics.failedTickets,
      unknownPatterns: 0,
      processingTimeMs: executionDuration,
      successRate: tickets.length > 0
        ? (tickets.length - statistics.failedTickets) / tickets.length
        : 1.0,
    },
    context: {
      sessionId,
    },
  });

  return {
    status: 'success',
    ticketsFound: tickets.length,
    newTickets: statistics.newTickets,
    updatedTickets: statistics.updatedTickets,
    unchangedTickets: statistics.unchangedTickets,
    failedTickets: statistics.failedTickets,
    executionDurationMs: executionDuration,
    scheduledNotifications,
  };
}

function toCollectionError(error: unknown, sessionId: string, startTime: number): AppError {
  const executionDuration = Date.now() - startTime;

  if (error instanceof DatabaseError) {
    const appError = new AppError(
      `[TicketCollectionUseCase] Database operation failed: ${error.message}`,
      ErrorCodes.TICKET_COLLECTION_FAILED,
      error,
      { sessionId, executionDurationMs: executionDuration },
    );

    CloudLogger.error('Ticket collection service error', {
      category: LogCategory.TICKET_COLLECTION,
      error: {
        details: appError.message,
        recoverable: true,
      },
    });
    return appError;
  }

  const appError = new AppError(
    `[TicketCollectionUseCase] Ticket collection failed: ${getErrorMessage(error)}`,
    ErrorCodes.USECASE_EXECUTION_FAILED,
    error instanceof Error ? error : undefined,
    { sessionId, executionDurationMs: executionDuration },
  );

  CloudLogger.error('Ticket collection failed', {
    category: LogCategory.TICKET_COLLECTION,
    error: {
      details: appError.message,
      recoverable: false,
    },
  });
  return appError;
}

async function upsertCollectedTickets(
  deps: CollectTicketsDeps,
  tickets: Ticket[],
): Promise<TicketUpsertResult[]> {
  if (tickets.length === 0) {
    return [];
  }

  const ticketIds = tickets.map((ticket) => ticket.id);
  const existingTicketsMap = await deps.ticketRepository.findByIds(ticketIds);

  const ticketsToUpsert: Ticket[] = [];
  const unchangedResults: TicketUpsertResult[] = [];
  const ticketMetadataMap = new Map<string, { original: Ticket; existing: Ticket | null }>();

  for (const ticket of tickets) {
    const existingTicket = existingTicketsMap.get(ticket.id) || null;

    if (existingTicket && ticket.hasSameBusinessData(existingTicket)) {
      unchangedResults.push({
        ticket,
        previousTicket: existingTicket,
        hasChanges: false,
      });
    } else {
      const ticketToUpsert = existingTicket ? existingTicket.mergeWith(ticket) : ticket;
      ticketsToUpsert.push(ticketToUpsert);
      ticketMetadataMap.set(ticketToUpsert.id, {
        original: ticket,
        existing: existingTicket,
      });
    }
  }

  const upsertResults: TicketUpsertResult[] = [...unchangedResults];

  if (ticketsToUpsert.length > 0) {
    try {
      const upsertedTickets = await deps.ticketRepository.upsertMany(ticketsToUpsert);

      for (const upsertedTicket of upsertedTickets) {
        const metadata = ticketMetadataMap.get(upsertedTicket.id);
        if (metadata) {
          const result: TicketUpsertResult = {
            ticket: upsertedTicket,
            previousTicket: metadata.existing,
            hasChanges: true,
          };
          upsertResults.push(result);
          logTicketUpsertResult(result);
        }
      }
    } catch (error) {
      CloudLogger.warning('Bulk upsert failed, falling back to individual upserts', {
        category: LogCategory.TICKET_COLLECTION,
        error: toErrorInfo(error, undefined, true),
        metadata: {
          ticketCount: ticketsToUpsert.length,
          fallbackReason: 'bulk_upsert_failed',
        },
      });

      for (const ticket of ticketsToUpsert) {
        try {
          const metadata = ticketMetadataMap.get(ticket.id);
          const upsertedTicket = await deps.ticketRepository.upsert(ticket);
          const result: TicketUpsertResult = {
            ticket: upsertedTicket,
            previousTicket: metadata?.existing || null,
            hasChanges: true,
          };
          upsertResults.push(result);
          logTicketUpsertResult(result);
        } catch (individualError) {
          CloudLogger.error(`Failed to process ticket (ID: ${ticket.id})`, {
            category: LogCategory.TICKET_COLLECTION,
            context: { ticketId: ticket.id },
            error: toErrorInfo(individualError, undefined, true),
          });
          upsertResults.push({
            ticket: ticket,
            previousTicket: null,
            hasChanges: false,
            error: getErrorMessage(individualError),
          });
        }
      }
    }
  }

  for (const unchangedResult of unchangedResults) {
    logTicketUpsertResult(unchangedResult);
  }

  return upsertResults;
}

async function scheduleUpcomingNotifications(
  deps: CollectTicketsDeps,
  sessionId: string,
  stage: 'before_collection' | 'after_collection',
): Promise<NotificationSchedulingSummary> {
  const tickets = await deps.ticketRepository.findByStatusIn(['before_sale']);
  const upcoming = listUpcomingNotifications(tickets, deps.now());
  const summary: NotificationSchedulingSummary = { created: 0, alreadyExists: 0, failed: 0 };

  for (const notification of upcoming) {
    try {
      const result = await deps.notificationSchedulerService.scheduleNotification(notification);
      if (result === 'created') summary.created++;
      else summary.alreadyExists++;
    } catch (error) {
      summary.failed++;
      CloudLogger.error('Failed to schedule notification', {
        category: LogCategory.NOTIFICATION,
        context: { ticketId: notification.ticketId, sessionId, stage },
        metadata: {
          notificationType: notification.notificationType,
          notificationTime: notification.notificationTime.toISOString(),
        },
        error: toErrorInfo(error, undefined, true),
      });
    }
  }

  CloudLogger.info(
    `Notifications scheduled (${stage}): ${summary.created} created, ${summary.alreadyExists} already existed, ${summary.failed} failed`,
    {
      category: LogCategory.NOTIFICATION,
      context: { sessionId, stage },
      data: { result: summary },
    },
  );
  return summary;
}

function logTicketUpsertResult(result: TicketUpsertResult): void {
  const { ticket, previousTicket, hasChanges, error } = result;

  if (error) {
    return;
  }

  let action: string;
  if (!previousTicket) {
    action = 'created';
  } else if (!hasChanges) {
    action = 'unchanged';
  } else {
    action = 'updated';
  }

  const logPayload = {
    category: LogCategory.TICKET_COLLECTION,
    context: {
      ticketId: ticket.id,
      matchName: ticket.matchName,
      stage: 'upsert',
    },
    data: {
      updated: {
        id: ticket.id,
        matchName: ticket.matchName,
        saleStatus: ticket.saleStatus,
        saleStartDate: ticket.saleStartDate?.toISOString(),
        saleEndDate: ticket.saleEndDate?.toISOString(),
        venue: ticket.venue ?? undefined,
        ticketTypes: ticket.ticketTypes,
        ticketUrl: ticket.ticketUrl ?? undefined,
      },
      ...(previousTicket && {
        existing: {
          id: previousTicket.id,
          matchName: previousTicket.matchName,
          saleStatus: previousTicket.saleStatus,
          saleStartDate: previousTicket.saleStartDate?.toISOString(),
          saleEndDate: previousTicket.saleEndDate?.toISOString(),
          venue: previousTicket.venue ?? undefined,
          ticketTypes: previousTicket.ticketTypes,
          ticketUrl: previousTicket.ticketUrl ?? undefined,
        },
      }),
    },
    metadata: {
      operation: action,
      hasChanges,
    },
  };

  CloudLogger.info(`Ticket ${action}: ${ticket.matchName}`, logPayload);
}

function calculateStatistics(upsertResults: TicketUpsertResult[]): {
  newTickets: number;
  updatedTickets: number;
  unchangedTickets: number;
  failedTickets: number;
} {
  const newTickets =
    upsertResults.filter((result) => !result.previousTicket && !result.error).length;
  const updatedTickets =
    upsertResults.filter((result) => result.previousTicket && result.hasChanges && !result.error)
      .length;
  const unchangedTickets =
    upsertResults.filter((result) => result.previousTicket && !result.hasChanges && !result.error)
      .length;
  const failedTickets = upsertResults.filter((result) => result.error).length;

  return { newTickets, updatedTickets, unchangedTickets, failedTickets };
}
