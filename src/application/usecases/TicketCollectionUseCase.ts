import { ScrapingService } from '@/infrastructure/services/scraping/ScrapingService.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

/**
 * Ticket Collection Use Case (DDD Application Service pattern)
 * Orchestrates away ticket collection workflow and health tracking
 * Following Clean Architecture layer structure
 */
export class TicketCollectionUseCase {
  constructor(
    private scrapingService: ScrapingService,
    private healthRepository: HealthRepositoryImpl,
  ) {}

  /**
   * Execute ticket collection workflow
   * Business goal: Complete ticket information collection
   * - Execute ticket scraping
   * - Record execution result to system_health table (Supabase free tier auto-pause prevention)
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      const tickets = await this.scrapingService.scrapeAwayTickets();

      const executionDuration = Date.now() - startTime;

      executionResult = {
        executedAt: new Date(),
        ticketsFound: tickets.length,
        status: 'success',
        executionDurationMs: executionDuration,
      };

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Daily execution completed successfully. Found ${tickets.length} tickets in ${executionDuration}ms`,
        );
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
      // Health recording failure is critical error
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
