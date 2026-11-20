import { Ticket } from '@/domain/entities/Ticket.ts';
import { CancellationReason } from '@/domain/entities/Notification.ts';
import {
  NotificationSchedulingService,
  type NotificationTiming,
} from '@/domain/services/NotificationSchedulingService.ts';
import type { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import type { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import type { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
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
}

export interface CollectTicketsDeps {
  ticketCollectionService: Pick<TicketCollectionService, 'collectAllTickets'>;
  ticketRepository: Pick<TicketRepository, 'findByIds' | 'upsertMany' | 'upsert'>;
  notificationRepository: Pick<NotificationRepository, 'findByTicketId' | 'update'>;
  notificationSchedulerService: Pick<
    NotificationSchedulerService,
    'scheduleNotifications' | 'cancelNotifications'
  >;
}

const notificationSchedulingService = new NotificationSchedulingService();

export async function collectTickets(
  deps: CollectTicketsDeps,
): Promise<TicketCollectionResult> {
  const startTime = Date.now();
  const sessionId = crypto.randomUUID();

  try {
    const tickets = await deps.ticketCollectionService.collectAllTickets();

    const upsertResults = await upsertCollectedTickets(deps, tickets);

    try {
      await scheduleTicketNotifications(deps, upsertResults);
    } catch (error) {
      CloudLogger.error('Failed to schedule notifications, but continuing ticket collection', {
        category: LogCategory.NOTIFICATION,
        error: toErrorInfo(error, undefined, true),
        context: { sessionId },
      });
    }

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
    };
  } catch (error) {
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
      throw appError;
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
    throw appError;
  }
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

async function scheduleTicketNotifications(
  deps: CollectTicketsDeps,
  upsertResults: TicketUpsertResult[],
): Promise<void> {
  const successfulResults = upsertResults.filter((result) => !result.error);

  const ticketsRequiringScheduling = notificationSchedulingService
    .filterTicketsRequiringScheduling(
      successfulResults.map((result) => ({
        ...result,
        previousTicket: result.previousTicket || undefined,
      })),
    );

  if (ticketsRequiringScheduling.length === 0) {
    return;
  }

  for (const { ticket, previousTicket } of ticketsRequiringScheduling) {
    if (previousTicket) {
      try {
        const notifications = await deps.notificationRepository.findByTicketId(ticket.id);
        const scheduledTasks = notifications
          .filter((notification) => notification.status === 'scheduled' && notification.cloudTaskId)
          .map((notification) => notification.cloudTaskId!);

        if (scheduledTasks.length > 0) {
          await deps.notificationSchedulerService.cancelNotifications(scheduledTasks);

          for (
            const notification of notifications.filter((notification) =>
              notification.status === 'scheduled'
            )
          ) {
            const reason: CancellationReason = determineCancellationReason(
              ticket,
              previousTicket!,
            );
            const cancelledNotification = notification.markAsCancelled(reason);
            await deps.notificationRepository.update(cancelledNotification);
          }
        }
      } catch (error) {
        CloudLogger.warning(`Failed to cancel existing notifications for ticket ${ticket.id}`, {
          category: LogCategory.NOTIFICATION,
          context: { ticketId: ticket.id },
          error: toErrorInfo(error, undefined, true),
        });
      }
    }

    try {
      const futureNotificationTimes = notificationSchedulingService
        .calculateNotificationTimes(ticket.saleStartDate);

      await deps.notificationSchedulerService.scheduleNotifications(
        ticket,
        futureNotificationTimes,
      );

      logNotificationScheduling(ticket, futureNotificationTimes);

      const updatedTicket = ticket.markNotificationScheduled();
      await deps.ticketRepository.upsert(updatedTicket);
    } catch (error) {
      CloudLogger.error(`Failed to schedule notifications for ticket ${ticket.id}`, {
        category: LogCategory.NOTIFICATION,
        context: { ticketId: ticket.id },
        error: toErrorInfo(error, undefined, true),
      });
    }
  }
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

function logNotificationScheduling(ticket: Ticket, scheduledTimes: NotificationTiming[]): void {
  const notifications = scheduledTimes.map(({ type, scheduledTime }) => ({
    type,
    scheduledTime: scheduledTime.toISOString(),
  }));

  CloudLogger.info(
    `Notifications scheduled for ${ticket.matchName} (${notifications.length} notifications)`,
    {
      category: LogCategory.NOTIFICATION,
      context: {
        ticketId: ticket.id,
      },
      data: {
        result: {
          matchName: ticket.matchName,
        },
      },
    },
  );
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

function determineCancellationReason(
  currentTicket: Ticket,
  previousTicket: Ticket,
): CancellationReason {
  if (currentTicket.saleStartDate?.getTime() !== previousTicket.saleStartDate?.getTime()) {
    return 'Cancelled due to sale date change';
  }

  if (currentTicket.saleStatus !== previousTicket.saleStatus) {
    return 'Cancelled due to ticket update';
  }

  return 'Cancelled due to ticket update';
}
