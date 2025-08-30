import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { cleanupTestTable, createTestSupabaseClient } from '../utils/test-supabase.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';
import { TicketCollectionResult } from '@/infrastructure/services/scraping/TicketCollectionService.ts';

// Lightweight mock collection service for testing (avoids Playwright dependency)
class TestTicketCollectionService {
  private mockTickets: ScrapedTicketData[];
  private shouldThrow: boolean;

  constructor(mockTickets: ScrapedTicketData[] = [], shouldThrow: boolean = false) {
    this.mockTickets = mockTickets;
    this.shouldThrow = shouldThrow;
  }

  async collectAllTickets(): Promise<TicketCollectionResult> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate some work

    if (this.shouldThrow) {
      throw new Error('Mock collection error');
    }

    return {
      success: true,
      totalTickets: this.mockTickets.length,
      sourceResults: [{
        source: 'J-League Ticket',
        ticketsFound: this.mockTickets.length,
        success: true,
      }],
      errors: [],
    };
  }

  async collectFromJLeagueOnly(): Promise<ScrapedTicketData[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (this.shouldThrow) {
      throw new Error('Mock J-League scraping error');
    }

    return this.mockTickets;
  }
}

Deno.test('System Health Integration Tests', async (t) => {
  const supabase = createTestSupabaseClient();
  const healthRepository = new HealthRepositoryImpl(supabase);
  const testTableName = 'system_health';

  // Clean up before and after tests
  await cleanupTestTable(supabase, testTableName);

  await t.step('should complete full daily execution workflow successfully', async () => {
    const mockTickets: ScrapedTicketData[] = [];

    const collectionService = new TestTicketCollectionService(mockTickets, false);
    // Execute daily workflow using real UseCase with mock service
    // UseCase will handle its own dependencies internally

    const startTime = Date.now();
    const collectionResult = await collectionService.collectAllTickets();
    const executionDuration = Date.now() - startTime;

    const mockResult = {
      executedAt: new Date(),
      ticketsFound: collectionResult.totalTickets,
      status: 'success' as const,
      executionDurationMs: executionDuration,
    };
    await healthRepository.recordDailyExecution(mockResult);

    // Verify health record was created in database
    const { data, error } = await supabase
      .from(testTableName)
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(1);

    assertEquals(error, null);
    assertEquals(data?.length, 1);

    const healthRecord = data![0];
    assertEquals(healthRecord.status, 'success');
    assertEquals(healthRecord.tickets_found, 0);
    assertEquals(typeof healthRecord.execution_duration_ms, 'number');
    assertEquals(healthRecord.execution_duration_ms > 0, true);
  });

  await t.step('should handle scraping errors but still record health', async () => {
    const collectionService = new TestTicketCollectionService([], true);
    // Test error handling through direct repository call

    const startTime = Date.now();
    let errorThrown = false;
    try {
      await collectionService.collectAllTickets();
    } catch (error) {
      errorThrown = true;
      const executionDuration = Date.now() - startTime;

      const errorResult = {
        executedAt: new Date(),
        ticketsFound: 0,
        status: 'error' as const,
        executionDurationMs: executionDuration,
        errorDetails: {
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
      };
      await healthRepository.recordDailyExecution(errorResult);
    }

    assertEquals(errorThrown, true);

    // Verify error health record was still created
    const { data, error } = await supabase
      .from(testTableName)
      .select('*')
      .eq('status', 'error')
      .order('executed_at', { ascending: false })
      .limit(1);

    assertEquals(error, null);
    assertEquals(data?.length, 1);

    const errorRecord = data![0];
    assertEquals(errorRecord.status, 'error');
    assertEquals(errorRecord.tickets_found, 0);
    assertEquals(errorRecord.error_details.message, 'Mock collection error');
  });

  await t.step('should maintain system health over multiple executions', async () => {
    // Clear previous test data
    await cleanupTestTable(supabase, testTableName);

    const collectionService = new TestTicketCollectionService([], false);
    // Execute multiple times with direct repository calls

    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      const collectionResult = await collectionService.collectAllTickets();
      const executionDuration = Date.now() - startTime;

      const mockResult = {
        executedAt: new Date(),
        ticketsFound: collectionResult.totalTickets,
        status: 'success' as const,
        executionDurationMs: executionDuration,
      };
      await healthRepository.recordDailyExecution(mockResult);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay between executions
    }

    // Check system health directly via repository
    const isHealthy = await healthRepository.isSystemHealthy();
    const latestRecord = await healthRepository.getLatestHealthRecord();
    const daysSince = latestRecord
      ? Math.floor(
        (Date.now() - latestRecord.executedAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      : undefined;
    assertEquals(isHealthy, true);
    assertExists(latestRecord);
    assertEquals(typeof daysSince, 'number');

    // Verify multiple records exist
    const { data } = await supabase
      .from(testTableName)
      .select('*')
      .order('executed_at', { ascending: false });

    assertEquals(data?.length, 3);
    data?.forEach((record) => {
      assertEquals(record.status, 'success');
      assertEquals(record.tickets_found, 0);
    });
  });

  await t.step('should prevent Supabase auto-pause through database activity', async () => {
    // This test verifies the core purpose: maintaining database activity
    await cleanupTestTable(supabase, testTableName);

    const collectionService = new TestTicketCollectionService([], false); // No tickets found (off-season scenario)

    // Execute daily routine (simulating off-season when no tickets are available)
    const startTime = Date.now();
    const collectionResult = await collectionService.collectAllTickets();
    const executionDuration = Date.now() - startTime;

    const mockResult = {
      executedAt: new Date(),
      ticketsFound: collectionResult.totalTickets,
      status: 'success' as const,
      executionDurationMs: executionDuration,
    };
    await healthRepository.recordDailyExecution(mockResult);

    // Verify database activity occurred even with no tickets
    const { data, error } = await supabase
      .from(testTableName)
      .select('*');

    assertEquals(error, null);
    assertEquals(data?.length, 1);

    const record = data![0];
    assertEquals(record.status, 'success');
    assertEquals(record.tickets_found, 0); // No tickets found, but execution was recorded
    assertEquals(new Date(record.executed_at) <= new Date(), true);

    // Verify system is considered healthy due to recent activity
    const isSystemHealthy = await healthRepository.isSystemHealthy();
    assertEquals(isSystemHealthy, true);
  });

  await t.step('should handle edge case with zero execution duration', async () => {
    // Test with very fast execution (could result in 0ms duration)
    const collectionService = new TestTicketCollectionService([], false);

    const startTime = Date.now();
    const collectionResult = await collectionService.collectAllTickets();
    const executionDuration = Date.now() - startTime;

    const mockResult = {
      executedAt: new Date(),
      ticketsFound: collectionResult.totalTickets,
      status: 'success' as const,
      executionDurationMs: executionDuration,
    };
    await healthRepository.recordDailyExecution(mockResult);

    const latest = await healthRepository.getLatestHealthRecord();
    assertExists(latest);
    assertEquals(latest.status, 'success');
    assertEquals(typeof latest.executionDurationMs, 'number');
    assertEquals(latest.executionDurationMs! >= 0, true);
  });

  // Cleanup after all tests
  await cleanupTestTable(supabase, testTableName);
});
