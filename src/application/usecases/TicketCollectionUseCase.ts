import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketCollectionResult, TicketUpsertResult } from '@/application/types/UseCaseResults.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

export class TicketCollectionUseCase {
  private ticketCollectionService: TicketCollectionService;
  private healthRepository: HealthRepositoryImpl;
  private ticketRepository: TicketRepositoryImpl;

  constructor() {
    this.ticketCollectionService = new TicketCollectionService();
    this.healthRepository = new HealthRepositoryImpl();
    this.ticketRepository = new TicketRepositoryImpl();
  }

  async execute(): Promise<TicketCollectionResult> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      const tickets = await this.ticketCollectionService.collectFromJLeagueOnly();

      const upsertResults = await this.upsertCollectedTickets(tickets);

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

      console.error(
        'Daily execution failed:',
        error instanceof Error ? error.message : String(error),
      );

      try {
        await this.healthRepository.recordDailyExecution(executionResult);
      } catch (healthError) {
        console.error(
          'CRITICAL: Failed to record health check - Supabase may auto-pause:',
          healthError,
        );
        handleSupabaseError('record daily health check', healthError as Error);
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
          'Failed to process ticket:',
          error instanceof Error ? error.message : String(error),
        );
        results.push({
          isNew: false,
          hasChanged: false,
          ticket: ticket,
        });
      }
    }

    return results;
  }

  private async upsertTicket(ticket: Ticket): Promise<TicketUpsertResult> {
    return await this.ticketRepository.upsert(ticket);
  }

  private calculateStatistics(upsertResults: TicketUpsertResult[]): {
    newTickets: number;
    updatedTickets: number;
    unchangedTickets: number;
  } {
    const newTickets = upsertResults.filter((r) => r.isNew).length;
    const updatedTickets = upsertResults.filter((r) => !r.isNew && r.hasChanged).length;
    const unchangedTickets = upsertResults.filter((r) => !r.isNew && !r.hasChanged).length;

    return { newTickets, updatedTickets, unchangedTickets };
  }
}
