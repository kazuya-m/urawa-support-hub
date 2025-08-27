import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { cleanupTestTable, createTestSupabaseClient } from '../utils/test-supabase.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { DailyExecutionService } from '@/infrastructure/services/DailyExecutionService.ts';
// Import removed to avoid Playwright dependency in tests
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';

// Lightweight mock scraping service for testing (avoids Playwright dependency)
class TestScrapingService {
  private mockTickets: ScrapedTicketData[];
  private shouldThrow: boolean;

  constructor(mockTickets: ScrapedTicketData[] = [], shouldThrow: boolean = false) {
    this.mockTickets = mockTickets;
    this.shouldThrow = shouldThrow;
  }

  async scrapeAwayTickets(): Promise<ScrapedTicketData[]> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate some work

    if (this.shouldThrow) {
      throw new Error('Mock scraping error');
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

    const scrapingService = new TestScrapingService(mockTickets, false);
    // deno-lint-ignore no-explicit-any
    const dailyService = new DailyExecutionService(scrapingService as any, healthRepository);

    // Execute daily workflow
    await dailyService.executeDaily();

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
    const scrapingService = new TestScrapingService([], true);
    // deno-lint-ignore no-explicit-any
    const dailyService = new DailyExecutionService(scrapingService as any, healthRepository);

    let errorThrown = false;
    try {
      await dailyService.executeDaily();
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, 'Mock scraping error');
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
    assertEquals(errorRecord.error_details.message, 'Mock scraping error');
  });

  await t.step('should maintain system health over multiple executions', async () => {
    // Clear previous test data
    await cleanupTestTable(supabase, testTableName);

    const scrapingService = new TestScrapingService([], false);
    // deno-lint-ignore no-explicit-any
    const dailyService = new DailyExecutionService(scrapingService as any, healthRepository);

    // Execute multiple times
    for (let i = 0; i < 3; i++) {
      await dailyService.executeDaily();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay between executions
    }

    // Check system health
    const healthStatus = await dailyService.checkSystemHealth();
    assertEquals(healthStatus.isHealthy, true);
    assertExists(healthStatus.lastExecution);
    assertEquals(typeof healthStatus.daysSinceLastExecution, 'number');

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

  await t.step('should cleanup old records while preserving recent ones', async () => {
    // Insert test records with different ages
    const now = new Date();
    const oldResult: HealthCheckResult = {
      executedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days old
      ticketsFound: 1,
      status: 'success',
    };

    const recentResult: HealthCheckResult = {
      executedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days old
      ticketsFound: 2,
      status: 'success',
    };

    await healthRepository.recordDailyExecution(oldResult);
    await healthRepository.recordDailyExecution(recentResult);

    // Cleanup records older than 30 days
    const scrapingService = new TestScrapingService([], false);
    // deno-lint-ignore no-explicit-any
    const dailyService = new DailyExecutionService(scrapingService as any, healthRepository);

    const deletedCount = await dailyService.cleanupOldHealthRecords(30);
    assertEquals(deletedCount >= 1, true); // At least the 40-day-old record should be deleted

    // Verify recent records remain
    const { data } = await supabase
      .from(testTableName)
      .select('*')
      .gte('executed_at', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString());

    assertEquals((data?.length || 0) >= 1, true); // Recent record should remain
  });

  await t.step('should prevent Supabase auto-pause through database activity', async () => {
    // This test verifies the core purpose: maintaining database activity
    await cleanupTestTable(supabase, testTableName);

    const scrapingService = new TestScrapingService([], false); // No tickets found (off-season scenario)
    // deno-lint-ignore no-explicit-any
    const dailyService = new DailyExecutionService(scrapingService as any, healthRepository);

    // Execute daily routine (simulating off-season when no tickets are available)
    await dailyService.executeDaily();

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
    const healthStatus = await dailyService.checkSystemHealth();
    assertEquals(healthStatus.isHealthy, true);
  });

  await t.step('should handle edge case with zero execution duration', async () => {
    // Test with very fast execution (could result in 0ms duration)
    const scrapingService = new TestScrapingService([], false);
    // deno-lint-ignore no-explicit-any
    const dailyService = new DailyExecutionService(scrapingService as any, healthRepository);

    await dailyService.executeDaily();

    const latest = await healthRepository.getLatestHealthRecord();
    assertExists(latest);
    assertEquals(latest.status, 'success');
    assertEquals(typeof latest.executionDurationMs, 'number');
    assertEquals(latest.executionDurationMs! >= 0, true);
  });

  // Cleanup after all tests
  await cleanupTestTable(supabase, testTableName);
});
