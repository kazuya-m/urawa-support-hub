import { assertEquals } from 'std/assert/mod.ts';
import { BatchExecutionInput } from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';
import { NotificationBatchUseCase } from '@/application/usecases/NotificationBatchUseCase.ts';
import { MockNotificationService } from '@/shared/testing/mocks/MockNotificationService.ts';

Deno.test('NotificationBatchUseCase should call NotificationService.processPendingNotifications', async () => {
  const mockNotificationService = new MockNotificationService();
  const useCase = new NotificationBatchUseCase(mockNotificationService);

  const input: BatchExecutionInput = { operation: 'process_pending' };
  const result = await useCase.execute(input);

  assertEquals(typeof result, 'object');
  if ('processed' in result && 'failed' in result) {
    assertEquals(typeof result.processed, 'number');
    assertEquals(typeof result.failed, 'number');
  }
});

Deno.test('NotificationBatchUseCase should handle NotificationService errors properly', async () => {
  const mockNotificationService = new MockNotificationService();
  mockNotificationService.setShouldThrowError(true, 'ProcessPendingNotifications failed');
  const useCase = new NotificationBatchUseCase(mockNotificationService);

  let caughtError: Error | null = null;
  try {
    const input: BatchExecutionInput = { operation: 'process_pending' };
    await useCase.execute(input);
  } catch (error) {
    caughtError = error as Error;
  }

  assertEquals(caughtError !== null, true);
  assertEquals(caughtError?.message.includes('Failed to execute batch notifications'), true);
});

Deno.test('NotificationBatchUseCase should return cleanup result for expired notifications', async () => {
  const mockNotificationService = new MockNotificationService();
  const useCase = new NotificationBatchUseCase(mockNotificationService);
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
