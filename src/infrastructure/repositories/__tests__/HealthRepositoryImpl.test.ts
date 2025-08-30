import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { createMockSupabaseClient } from '@/infrastructure/repositories/__tests__/test-utils/SupabaseMock.ts';

Deno.test('HealthRepositoryImpl Tests', async (t) => {
  const mockHealthData = [
    {
      id: '1',
      executed_at: '2025-01-01T12:00:00Z',
      tickets_found: 3,
      status: 'success',
      execution_duration_ms: 1500,
      error_details: null,
    },
    {
      id: '2',
      executed_at: '2025-01-02T12:00:00Z',
      tickets_found: 5,
      status: 'success',
      execution_duration_ms: 2000,
      error_details: null,
    },
  ];

  await t.step('should record daily execution successfully', async () => {
    const mockClient = createMockSupabaseClient(mockHealthData);
    const repository = new HealthRepositoryImpl(mockClient);

    const result: HealthCheckResult = {
      executedAt: new Date('2025-01-01T12:00:00Z'),
      ticketsFound: 3,
      status: 'success',
      executionDurationMs: 1500,
    };

    await repository.recordDailyExecution(result);
  });

  await t.step('should get latest health record when data exists', async () => {
    const mockClient = createMockSupabaseClient(mockHealthData);
    const repository = new HealthRepositoryImpl(mockClient);

    const latestRecord = await repository.getLatestHealthRecord();

    assertExists(latestRecord);
    assertEquals(latestRecord.ticketsFound, 3);
    assertEquals(latestRecord.status, 'success');
  });

  await t.step('should return null when no health records exist', async () => {
    const mockClient = createMockSupabaseClient([], {
      shouldError: true,
      errorMessage: 'PGRST116',
      errorCode: 'PGRST116',
    });
    const repository = new HealthRepositoryImpl(mockClient);

    const latestRecord = await repository.getLatestHealthRecord();
    assertEquals(latestRecord, null);
  });

  await t.step('should get health history for specified days', async () => {
    const mockClient = createMockSupabaseClient(mockHealthData);
    const repository = new HealthRepositoryImpl(mockClient);

    const history = await repository.getHealthHistory(7);

    assertExists(history);
    assertEquals(Array.isArray(history), true);
    assertEquals(history.length, 2);
  });

  await t.step('should check system health status', async () => {
    const mockClient = createMockSupabaseClient([{ id: '1' }]);
    const repository = new HealthRepositoryImpl(mockClient);

    const isHealthy = await repository.isSystemHealthy();
    assertEquals(isHealthy, true);
  });

  await t.step('should cleanup old records and return count', async () => {
    const mockClient = createMockSupabaseClient([{ id: 1 }, { id: 2 }]);
    const repository = new HealthRepositoryImpl(mockClient);

    const deleteCount = await repository.cleanupOldRecords(30);
    assertEquals(deleteCount, 2);
  });

  await t.step('should handle error details in health records', async () => {
    const mockClient = createMockSupabaseClient(mockHealthData);
    const repository = new HealthRepositoryImpl(mockClient);

    const result: HealthCheckResult = {
      executedAt: new Date('2025-01-01T12:00:00Z'),
      ticketsFound: 0,
      status: 'error',
      executionDurationMs: 500,
      errorDetails: {
        message: 'Test error',
        stack: 'Error stack',
      },
    };

    await repository.recordDailyExecution(result);
  });

  await t.step('should have correct method signatures and types', () => {
    const mockClient = createMockSupabaseClient([]);
    const repository = new HealthRepositoryImpl(mockClient);

    assertEquals(typeof repository.recordDailyExecution, 'function');
    assertEquals(typeof repository.getLatestHealthRecord, 'function');
    assertEquals(typeof repository.getHealthHistory, 'function');
    assertEquals(typeof repository.isSystemHealthy, 'function');
    assertEquals(typeof repository.cleanupOldRecords, 'function');
  });
});
