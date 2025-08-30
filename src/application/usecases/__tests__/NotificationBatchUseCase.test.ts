import { assertEquals } from 'std/assert/mod.ts';
import { spy } from 'testing/mock.ts';
import { NotificationBatchUseCase } from '../NotificationBatchUseCase.ts';

Deno.test('NotificationBatchUseCase', async (t) => {
  await t.step('should call NotificationService.processPendingNotifications', async () => {
    const useCase = new NotificationBatchUseCase();

    // NotificationServiceのモック作成
    const mockProcessPendingNotifications = spy(() => Promise.resolve());

    Object.defineProperty(useCase, 'notificationService', {
      value: {
        processPendingNotifications: mockProcessPendingNotifications,
      },
      writable: true,
    });

    const result = await useCase.executePendingNotifications();

    // モックが正しく呼び出されたことを検証
    assertEquals(mockProcessPendingNotifications.calls.length, 1);
    assertEquals(typeof result, 'object');
    assertEquals(typeof result.processed, 'number');
    assertEquals(typeof result.failed, 'number');
  });

  await t.step('should handle NotificationService errors properly', async () => {
    const useCase = new NotificationBatchUseCase();
    const testError = new Error('ProcessPendingNotifications failed');

    const mockProcessPendingNotifications = spy(() => Promise.reject(testError));

    Object.defineProperty(useCase, 'notificationService', {
      value: {
        processPendingNotifications: mockProcessPendingNotifications,
      },
      writable: true,
    });

    let caughtError: Error | null = null;
    try {
      await useCase.executePendingNotifications();
    } catch (error) {
      caughtError = error as Error;
    }

    // エラーが適切に再スローされることを確認
    assertEquals(caughtError?.message.includes('ProcessPendingNotifications failed'), true);
    assertEquals(mockProcessPendingNotifications.calls.length, 1);
  });

  await t.step('should return cleanup result for expired notifications', async () => {
    const useCase = new NotificationBatchUseCase();

    const result = await useCase.cleanupExpiredNotifications();

    // CleanupResultの型と構造を確認
    assertEquals(typeof result, 'object');
    assertEquals(typeof result.cleaned, 'number');
    assertEquals(result.cleaned, 0); // 現在は未実装のため0
  });
});
