import { assertEquals, assertThrows } from 'std/assert/mod.ts';
import { HealthCheckResult, SystemHealth, SystemHealthStatus } from '../SystemHealth.ts';

Deno.test('SystemHealth Entity Tests', async (t) => {
  await t.step('should create SystemHealth with valid props', () => {
    const executedAt = new Date('2025-01-01T12:00:00Z');
    const createdAt = new Date('2025-01-01T12:00:01Z');

    const health = new SystemHealth({
      id: 'test-id',
      executedAt,
      ticketsFound: 5,
      status: 'success',
      executionDurationMs: 1000,
      createdAt,
    });

    assertEquals(health.id, 'test-id');
    assertEquals(health.executedAt, executedAt);
    assertEquals(health.ticketsFound, 5);
    assertEquals(health.status, 'success');
    assertEquals(health.executionDurationMs, 1000);
    assertEquals(health.createdAt, createdAt);
  });

  await t.step('should create SystemHealth without optional fields', () => {
    const executedAt = new Date('2025-01-01T12:00:00Z');
    const createdAt = new Date('2025-01-01T12:00:01Z');

    const health = new SystemHealth({
      id: 'test-id',
      executedAt,
      ticketsFound: 0,
      status: 'error',
      createdAt,
    });

    assertEquals(health.executionDurationMs, undefined);
    assertEquals(health.errorDetails, undefined);
  });

  await t.step('should validate required fields', () => {
    const validProps = {
      id: 'test-id',
      executedAt: new Date(),
      ticketsFound: 0,
      status: 'success' as const,
      createdAt: new Date(),
    };

    // Test missing ID
    assertThrows(
      () => new SystemHealth({ ...validProps, id: '' }),
      Error,
      'SystemHealth ID is required',
    );

    // Test invalid status
    assertThrows(
      () => new SystemHealth({ ...validProps, status: 'invalid' as SystemHealthStatus }),
      Error,
      'Invalid status',
    );

    // Test negative tickets found
    assertThrows(
      () => new SystemHealth({ ...validProps, ticketsFound: -1 }),
      Error,
      'Tickets found count cannot be negative',
    );

    // Test negative execution duration
    assertThrows(
      () => new SystemHealth({ ...validProps, executionDurationMs: -1 }),
      Error,
      'Execution duration cannot be negative',
    );
  });

  await t.step('should validate date relationships', () => {
    const executedAt = new Date('2025-01-01T12:00:00Z');
    const beforeExecution = new Date('2025-01-01T11:59:59Z');

    assertThrows(
      () =>
        new SystemHealth({
          id: 'test-id',
          executedAt,
          ticketsFound: 0,
          status: 'success',
          createdAt: beforeExecution,
        }),
      Error,
      'Created date cannot be before execution date',
    );
  });

  await t.step('should check health status correctly', () => {
    const successHealth = new SystemHealth({
      id: 'success-id',
      executedAt: new Date(),
      ticketsFound: 5,
      status: 'success',
      createdAt: new Date(),
    });

    const errorHealth = new SystemHealth({
      id: 'error-id',
      executedAt: new Date(),
      ticketsFound: 0,
      status: 'error',
      createdAt: new Date(),
    });

    assertEquals(successHealth.isHealthy(), true);
    assertEquals(successHealth.hasErrors(), false);
    assertEquals(errorHealth.isHealthy(), false);
    assertEquals(errorHealth.hasErrors(), true);
  });

  await t.step('should create from HealthCheckResult', () => {
    const result: HealthCheckResult = {
      executedAt: new Date('2025-01-01T12:00:00Z'),
      ticketsFound: 3,
      status: 'success',
      executionDurationMs: 2000,
      errorDetails: { message: 'test error' },
    };

    const health = SystemHealth.createFromHealthCheck(result);

    assertEquals(health.executedAt, result.executedAt);
    assertEquals(health.ticketsFound, result.ticketsFound);
    assertEquals(health.status, result.status);
    assertEquals(health.executionDurationMs, result.executionDurationMs);
    assertEquals(health.errorDetails, result.errorDetails);
    assertEquals(typeof health.id, 'string');
  });

  await t.step('should return plain object correctly', () => {
    const executedAt = new Date('2025-01-01T12:00:00Z');
    const createdAt = new Date('2025-01-01T12:00:01Z');
    const errorDetails = { message: 'test error' };

    const health = new SystemHealth({
      id: 'test-id',
      executedAt,
      ticketsFound: 5,
      status: 'partial',
      executionDurationMs: 1500,
      errorDetails,
      createdAt,
    });

    const plainObject = health.toPlainObject();

    assertEquals(plainObject.id, 'test-id');
    assertEquals(plainObject.executedAt, executedAt);
    assertEquals(plainObject.ticketsFound, 5);
    assertEquals(plainObject.status, 'partial');
    assertEquals(plainObject.executionDurationMs, 1500);
    assertEquals(plainObject.errorDetails, errorDetails);
    assertEquals(plainObject.createdAt, createdAt);
  });

  await t.step('should handle error details immutability', () => {
    const originalErrorDetails = { message: 'original' };
    const health = new SystemHealth({
      id: 'test-id',
      executedAt: new Date(),
      ticketsFound: 0,
      status: 'error',
      errorDetails: originalErrorDetails,
      createdAt: new Date(),
    });

    const returnedErrorDetails = health.errorDetails;
    if (returnedErrorDetails) {
      returnedErrorDetails.message = 'modified';
    }

    // Original should remain unchanged
    assertEquals(originalErrorDetails.message, 'original');
  });
});
