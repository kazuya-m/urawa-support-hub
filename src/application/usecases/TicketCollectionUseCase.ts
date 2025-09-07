import { ITicketCollectionService } from '@/application/interfaces/services/ITicketCollectionService.ts';
import { IHealthRepository } from '@/application/interfaces/repositories/IHealthRepository.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';
import { INotificationSchedulerService } from '@/application/interfaces/services/INotificationSchedulerService.ts';
import { INotificationSchedulingService } from '@/domain/interfaces/services/INotificationSchedulingService.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketCollectionResult, TicketUpsertResult } from '@/application/types/UseCaseResults.ts';
import { CancellationReason } from '@/domain/entities/Notification.ts';
import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';

export class TicketCollectionUseCase implements ITicketCollectionUseCase {
  constructor(
    private readonly ticketCollectionService: ITicketCollectionService,
    private readonly healthRepository: IHealthRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationSchedulingService: INotificationSchedulingService,
    private readonly notificationSchedulerService: INotificationSchedulerService,
  ) {}

  async execute(): Promise<TicketCollectionResult> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      const tickets = await this.ticketCollectionService.collectAllTickets();

      const upsertResults = await this.upsertCollectedTickets(tickets);

      await this.scheduleTicketNotifications(upsertResults);

      const executionDuration = Date.now() - startTime;

      const statistics = this.calculateStatistics(upsertResults);

      executionResult = {
        executedAt: new Date(),
        ticketsFound: tickets.length,
        status: 'success',
        executionDurationMs: executionDuration,
      };

      await this.healthRepository.recordDailyExecution(executionResult);

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

      executionResult = {
        executedAt: new Date(),
        ticketsFound: 0,
        status: 'error',
        executionDurationMs: executionDuration,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };

      if (Deno.env.get('DENO_ENV') !== 'production') {
        console.error(
          'Daily execution failed:',
          error instanceof Error ? error.message : String(error),
        );
      }

      try {
        await this.healthRepository.recordDailyExecution(executionResult);
      } catch (healthError) {
        if (Deno.env.get('DENO_ENV') !== 'production') {
          console.error(
            'CRITICAL: Failed to record health check - Supabase may auto-pause:',
            healthError,
          );
        }
      }

      return {
        status: 'error',
        ticketsFound: 0,
        executionDurationMs: executionDuration,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  }

  private async upsertCollectedTickets(tickets: Ticket[]): Promise<TicketUpsertResult[]> {
    const results: TicketUpsertResult[] = [];

    for (const ticket of tickets) {
      try {
        const result = await this.upsertTicket(ticket);
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to process ticket (ID: ${ticket.id}):`,
          error instanceof Error ? error.message : String(error),
        );
        results.push({
          ticket: ticket,
          previousTicket: null,
          hasChanges: false,
          error: error instanceof Error ? error.message : String(error),
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
              await this.notificationRepository.save(cancelledNotification);
            }
          }
        } catch (error) {
          console.error(`Failed to cancel existing notifications for ticket ${ticket.id}:`, error);
        }
      }

      try {
        const futureNotificationTimes = this.notificationSchedulingService
          .calculateNotificationTimes(ticket.saleStartDate);

        await this.notificationSchedulerService.scheduleNotifications(
          ticket,
          futureNotificationTimes,
        );
        const updatedTicket = ticket.markNotificationScheduled();
        await this.ticketRepository.upsert(updatedTicket);
      } catch (error) {
        console.error(`Failed to schedule notifications for ticket ${ticket.id}:`, error);
      }
    }
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
