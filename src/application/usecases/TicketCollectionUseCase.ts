import { ITicketCollectionService } from '@/application/interfaces/services/ITicketCollectionService.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';
import { INotificationSchedulerService } from '@/application/interfaces/services/INotificationSchedulerService.ts';
import { INotificationSchedulingService } from '@/domain/interfaces/services/INotificationSchedulingService.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketCollectionResult, TicketUpsertResult } from '@/application/types/UseCaseResults.ts';
import { CancellationReason } from '@/domain/entities/Notification.ts';
import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';
import { ErrorCodes as AppErrorCodes } from '@/shared/errors/ErrorCodes.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class TicketCollectionUseCase implements ITicketCollectionUseCase {
  constructor(
    private readonly ticketCollectionService: ITicketCollectionService,
    private readonly ticketRepository: ITicketRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationSchedulingService: INotificationSchedulingService,
    private readonly notificationSchedulerService: INotificationSchedulerService,
  ) {}

  async execute(): Promise<TicketCollectionResult> {
    const startTime = Date.now();
    const sessionId = crypto.randomUUID();

    try {
      const tickets = await this.ticketCollectionService.collectAllTickets();

      const upsertResults = await this.upsertCollectedTickets(tickets);

      await this.scheduleTicketNotifications(upsertResults);

      const executionDuration = Date.now() - startTime;

      const statistics = this.calculateStatistics(upsertResults);

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

      // ApplicationErrorとして再ラップ
      if (error instanceof DatabaseError) {
        const appError = new ApplicationError(
          'TicketCollectionUseCase',
          `Database operation failed: ${error.message}`,
          AppErrorCodes.TICKET_COLLECTION_FAILED,
          error,
          { sessionId, executionDurationMs: executionDuration },
        );

        // 構造化ログ出力
        CloudLogger.error('Ticket collection service error', {
          category: LogCategory.TICKET_COLLECTION,
          error: {
            details: appError.message,
            recoverable: true,
          },
        });
        throw appError;
      }

      // その他のエラー
      const appError = new ApplicationError(
        'TicketCollectionUseCase',
        `Ticket collection failed: ${getErrorMessage(error)}`,
        AppErrorCodes.USECASE_EXECUTION_FAILED,
        error instanceof Error ? error : undefined,
        { sessionId, executionDurationMs: executionDuration },
      );

      // 構造化ログ出力
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

  private async upsertCollectedTickets(tickets: Ticket[]): Promise<TicketUpsertResult[]> {
    const results: TicketUpsertResult[] = [];

    for (const ticket of tickets) {
      try {
        const result = await this.upsertTicket(ticket);
        results.push(result);
        this.logTicketUpsertResult(result);
      } catch (error) {
        CloudLogger.error(`Failed to process ticket (ID: ${ticket.id})`, {
          category: LogCategory.TICKET_COLLECTION,
          context: { ticketId: ticket.id },
          error: toErrorInfo(error, undefined, true),
        });
        results.push({
          ticket: ticket,
          previousTicket: null,
          hasChanges: false,
          error: getErrorMessage(error),
        });
      }
    }

    return results;
  }

  private async upsertTicket(ticket: Ticket): Promise<TicketUpsertResult> {
    const previousTicket = await this.ticketRepository.findById(ticket.id);

    if (previousTicket && ticket.hasSameBusinessData(previousTicket)) {
      return {
        ticket,
        previousTicket,
        hasChanges: false,
      };
    }

    const upsertedTicket = await this.ticketRepository.upsert(ticket);

    return {
      ticket: upsertedTicket,
      previousTicket,
      hasChanges: true,
    };
  }

  private async scheduleTicketNotifications(upsertResults: TicketUpsertResult[]): Promise<void> {
    const successfulResults = upsertResults.filter((result) => !result.error);

    const ticketsRequiringScheduling = this.notificationSchedulingService
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
          const notifications = await this.notificationRepository.findByTicketId(ticket.id);
          const scheduledTasks = notifications
            .filter((notification) =>
              notification.status === 'scheduled' && notification.cloudTaskId
            )
            .map((notification) => notification.cloudTaskId!);

          if (scheduledTasks.length > 0) {
            await this.notificationSchedulerService.cancelNotifications(scheduledTasks);

            for (
              const notification of notifications.filter((notification) =>
                notification.status === 'scheduled'
              )
            ) {
              const reason: CancellationReason = this.determineCancellationReason(
                ticket,
                previousTicket!,
              );
              const cancelledNotification = notification.markAsCancelled(reason, new Date());
              await this.notificationRepository.update(cancelledNotification);
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
        const futureNotificationTimes = this.notificationSchedulingService
          .calculateNotificationTimes(ticket.saleStartDate);

        await this.notificationSchedulerService.scheduleNotifications(
          ticket,
          futureNotificationTimes,
        );

        this.logNotificationScheduling(ticket, futureNotificationTimes);

        const updatedTicket = ticket.markNotificationScheduled();
        await this.ticketRepository.upsert(updatedTicket);
      } catch (error) {
        CloudLogger.error(`Failed to schedule notifications for ticket ${ticket.id}`, {
          category: LogCategory.NOTIFICATION,
          context: { ticketId: ticket.id },
          error: toErrorInfo(error, undefined, true),
        });
      }
    }
  }

  private logTicketUpsertResult(result: TicketUpsertResult): void {
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
      },
    };

    CloudLogger.info(`Ticket ${action}: ${ticket.matchName}`, logPayload);
  }

  private logNotificationScheduling(ticket: Ticket, scheduledTimes: NotificationTiming[]): void {
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

  private calculateStatistics(upsertResults: TicketUpsertResult[]): {
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

  private determineCancellationReason(
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
}
