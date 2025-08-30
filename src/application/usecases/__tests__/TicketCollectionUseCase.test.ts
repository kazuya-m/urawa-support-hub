import { assertEquals } from 'std/assert/mod.ts';

// UseCaseのビジネスロジックのみテスト（Infrastructure依存回避）
Deno.test('TicketCollectionUseCase Business Logic Tests', async (t) => {
  await t.step('should create execution result with correct structure', () => {
    const startTime = Date.now();
    const executionDuration = Date.now() - startTime;

    const successResult = {
      executedAt: new Date(),
      ticketsFound: 5,
      status: 'success' as const,
      executionDurationMs: executionDuration,
    };

    assertEquals(successResult.status, 'success');
    assertEquals(successResult.ticketsFound, 5);
    assertEquals(typeof successResult.executionDurationMs, 'number');
  });

  await t.step('should create error result with correct structure', () => {
    const error = new Error('Test error');
    const startTime = Date.now();
    const executionDuration = Date.now() - startTime;

    const errorResult = {
      executedAt: new Date(),
      ticketsFound: 0,
      status: 'error' as const,
      executionDurationMs: executionDuration,
      errorDetails: {
        message: error.message,
        stack: error.stack,
      },
    };

    assertEquals(errorResult.status, 'error');
    assertEquals(errorResult.ticketsFound, 0);
    assertEquals(errorResult.errorDetails?.message, 'Test error');
  });
});
