import { assertEquals } from 'std/assert/mod.ts';
import { returnsNext, stub } from 'std/testing/mock.ts';
import {
  BatchExecutionInput,
  NotificationBatchUseCase,
} from '@/application/usecases/NotificationBatchUseCase.ts';

Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('NotificationBatchUseCase should call NotificationService.processPendingNotifications', async () => {
  const useCase = new NotificationBatchUseCase();

  const mockMethod = stub(
    useCase['notificationService'],
    'processPendingNotifications',
    returnsNext([Promise.resolve()]),
  );

  try {
    const input: BatchExecutionInput = { operation: 'process_pending' };
    const result = await useCase.execute(input);

    assertEquals(mockMethod.calls.length, 1);
    assertEquals(typeof result, 'object');
    if ('processed' in result && 'failed' in result) {
      assertEquals(typeof result.processed, 'number');
      assertEquals(typeof result.failed, 'number');
    }
  } finally {
    mockMethod.restore();
  }
});

Deno.test('NotificationBatchUseCase should handle NotificationService errors properly', async () => {
  const useCase = new NotificationBatchUseCase();
  const testError = new Error('ProcessPendingNotifications failed');

  const mockMethod = stub(
    useCase['notificationService'],
    'processPendingNotifications',
    returnsNext([Promise.reject(testError)]),
  );

  try {
    let caughtError: Error | null = null;
    try {
      const input: BatchExecutionInput = { operation: 'process_pending' };
      await useCase.execute(input);
    } catch (error) {
      caughtError = error as Error;
    }

    assertEquals(caughtError !== null, true);
    assertEquals(caughtError?.message.includes('Failed to execute batch notifications'), true);
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore();
  }
});

Deno.test('NotificationBatchUseCase should return cleanup result for expired notifications', async () => {
  const useCase = new NotificationBatchUseCase();
  const input: BatchExecutionInput = { operation: 'cleanup_expired' };
  const result = await useCase.execute(input);

  // CleanupResultの型と構造を確認
  assertEquals(typeof result, 'object');
  // CleanupResultの型をチェック
  if ('cleaned' in result) {
    assertEquals(typeof result.cleaned, 'number');
    assertEquals(result.cleaned, 0); // 現在は未実装のため0
  }
});
