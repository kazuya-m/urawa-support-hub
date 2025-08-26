import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { HealthRepositoryImpl } from '../HealthRepositoryImpl.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import {
  cleanupTestTable,
  createTestSupabaseClient,
} from '../../../../tests/utils/test-supabase.ts';

const testTableName = 'system_health';

Deno.test('HealthRepositoryImpl Tests', async (t) => {
  const supabase = createTestSupabaseClient();
  const repository = new HealthRepositoryImpl(supabase);

  // Clean up before and after tests
  await cleanupTestTable(supabase, testTableName);

  await t.step('should record daily execution', async () => {
    const result: HealthCheckResult = {
      executedAt: new Date('2025-01-01T12:00:00Z'),
      ticketsFound: 3,
      status: 'success',
      executionDurationMs: 1500,
    };

    await repository.recordDailyExecution(result);

    // Verify the record was inserted
    const { data, error } = await supabase
      .from(testTableName)
      .select('*')
      .eq('tickets_found', 3);

    assertEquals(error, null);
    assertEquals(data?.length, 1);
    assertEquals(data?.[0].tickets_found, 3);
    assertEquals(data?.[0].status, 'success');
    assertEquals(data?.[0].execution_duration_ms, 1500);
  });

  await t.step('should get latest health record', async () => {
    // Insert multiple records with different dates
    const olderResult: HealthCheckResult = {
      executedAt: new Date('2025-01-01T10:00:00Z'),
      ticketsFound: 1,
      status: 'success',
    };

    const newerResult: HealthCheckResult = {
      executedAt: new Date('2025-01-01T14:00:00Z'),
      ticketsFound: 2,
      status: 'error',
    };

    await repository.recordDailyExecution(olderResult);
    await repository.recordDailyExecution(newerResult);

    const latest = await repository.getLatestHealthRecord();

    assertExists(latest);
    assertEquals(latest.ticketsFound, 2);
    assertEquals(latest.status, 'error');
  });

  await t.step('should return null when no health records exist', async () => {
    await cleanupTestTable(supabase, testTableName);

    const latest = await repository.getLatestHealthRecord();
    assertEquals(latest, null);
  });

  await t.step('should get health history for specified days', async () => {
    await cleanupTestTable(supabase, testTableName);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Insert records at different dates
    await repository.recordDailyExecution({
      executedAt: sevenDaysAgo,
      ticketsFound: 1,
      status: 'success',
    });

    await repository.recordDailyExecution({
      executedAt: threeDaysAgo,
      ticketsFound: 2,
      status: 'success',
    });

    await repository.recordDailyExecution({
      executedAt: now,
      ticketsFound: 3,
      status: 'success',
    });

    // Get history for last 5 days (should exclude the 7-day-old record)
    const history = await repository.getHealthHistory(5);

    assertEquals(history.length, 2);
    assertEquals(history[0].ticketsFound, 3); // Most recent first
    assertEquals(history[1].ticketsFound, 2);
  });

  await t.step('should check if system is healthy (has records within 24 hours)', async () => {
    await cleanupTestTable(supabase, testTableName);

    // Initially unhealthy (no records)
    const initialHealth = await repository.isSystemHealthy();
    assertEquals(initialHealth, false);

    // Add recent record
    const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
    await repository.recordDailyExecution({
      executedAt: recentTime,
      ticketsFound: 1,
      status: 'success',
    });

    const healthyStatus = await repository.isSystemHealthy();
    assertEquals(healthyStatus, true);

    // Add old record (should still be healthy due to recent record)
    const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    await repository.recordDailyExecution({
      executedAt: oldTime,
      ticketsFound: 2,
      status: 'success',
    });

    const stillHealthy = await repository.isSystemHealthy();
    assertEquals(stillHealthy, true);
  });

  await t.step('should cleanup old records and return count', async () => {
    await cleanupTestTable(supabase, testTableName);

    const now = new Date();
    const oldDate = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
    const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

    // Insert old and recent records
    await repository.recordDailyExecution({
      executedAt: oldDate,
      ticketsFound: 1,
      status: 'success',
    });

    await repository.recordDailyExecution({
      executedAt: recentDate,
      ticketsFound: 2,
      status: 'success',
    });

    // Cleanup records older than 30 days
    const deletedCount = await repository.cleanupOldRecords(30);

    assertEquals(deletedCount, 1);

    // Verify only recent record remains
    const { data } = await supabase
      .from(testTableName)
      .select('*');

    assertEquals(data?.length, 1);
    assertEquals(data?.[0].tickets_found, 2);
  });

  await t.step('should handle error details in health records', async () => {
    await cleanupTestTable(supabase, testTableName);

    const errorResult: HealthCheckResult = {
      executedAt: new Date(),
      ticketsFound: 0,
      status: 'error',
      errorDetails: {
        message: 'Test error',
        code: 'TEST_ERROR',
        stack: 'Error stack trace',
      },
    };

    await repository.recordDailyExecution(errorResult);

    const latest = await repository.getLatestHealthRecord();

    assertExists(latest);
    assertEquals(latest.status, 'error');
    assertEquals(latest.errorDetails?.message, 'Test error');
    assertEquals(latest.errorDetails?.code, 'TEST_ERROR');
  });

  // Cleanup after all tests
  await cleanupTestTable(supabase, testTableName);
});
