import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

export class TicketCollectionUseCase {
  private ticketCollectionService: TicketCollectionService;
  private healthRepository: HealthRepositoryImpl;

  constructor() {
    this.ticketCollectionService = new TicketCollectionService();
    this.healthRepository = new HealthRepositoryImpl();
  }

  async execute(): Promise<void> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      const collectionResult = await this.ticketCollectionService.collectAllTickets();

      const executionDuration = Date.now() - startTime;

      executionResult = {
        executedAt: new Date(),
        ticketsFound: collectionResult.totalTickets,
        status: 'success',
        executionDurationMs: executionDuration,
      };

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Daily execution completed successfully. Found ${collectionResult.totalTickets} tickets in ${executionDuration}ms`,
        );
        console.log(`Source results:`, collectionResult.sourceResults);
      }
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

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.error(`Daily execution failed after ${executionDuration}ms:`, error);
      }
    }

    try {
      await this.healthRepository.recordDailyExecution(executionResult);

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Health check recorded: status=${executionResult.status}, tickets=${executionResult.ticketsFound}`,
        );
      }
    } catch (healthError) {
      console.error(
        'CRITICAL: Failed to record health check - Supabase may auto-pause:',
        healthError,
      );
      handleSupabaseError('record daily health check', healthError as Error);
    }

    if (executionResult.status === 'error') {
      throw new Error(executionResult.errorDetails?.message as string);
    }
  }
}
