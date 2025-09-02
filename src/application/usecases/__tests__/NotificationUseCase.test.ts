import { assert, assertEquals } from 'std/assert/mod.ts';
import { returnsNext, stub } from 'std/testing/mock.ts';
import {
  NotificationExecutionInput,
  NotificationUseCase,
} from '@/application/usecases/NotificationUseCase.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';

// テスト用環境変数を設定（Supabaseクライアント作成のため）
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('NotificationUseCase should call NotificationService.processScheduledNotification with correct input', async () => {
  const useCase = new NotificationUseCase();

  // processScheduledNotification メソッドをモック化
  const mockMethod = stub(
    useCase['notificationService'],
    'processScheduledNotification',
    returnsNext([Promise.resolve()]),
  );

  try {
    const input: NotificationExecutionInput = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    await useCase.execute(input);

    // モックが正しく呼び出されたことを検証
    assertEquals(mockMethod.calls.length, 1);
    assertEquals(mockMethod.calls[0].args[0], input);
  } finally {
    mockMethod.restore();
  }
});

Deno.test('NotificationUseCase should handle NotificationService errors properly', async () => {
  const useCase = new NotificationUseCase();
  const testError = new Error('NotificationService failed');

  // エラーを投げるモック
  const mockMethod = stub(
    useCase['notificationService'],
    'processScheduledNotification',
    returnsNext([Promise.reject(testError)]),
  );

  try {
    const input: NotificationExecutionInput = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    let caughtError: Error | null = null;
    try {
      await useCase.execute(input);
    } catch (error) {
      caughtError = error as Error;
    }

    // エラーが適切に再スローされることを確認
    assertEquals(caughtError?.message.includes('NotificationService failed'), true);
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore();
  }
});

Deno.test('NotificationUseCase should return successful result with execution time', async () => {
  const useCase = new NotificationUseCase();

  const mockMethod = stub(
    useCase['notificationService'],
    'processScheduledNotification',
    returnsNext([Promise.resolve()]),
  );

  try {
    const input: NotificationExecutionInput = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    const result = await useCase.execute(input);

    // 戻り値の検証
    assertEquals(result.status, 'success');
    assertEquals(result.ticketId, 'test-ticket-123');
    assertEquals(result.notificationType, 'day_before');
    assert(typeof result.executionDurationMs === 'number');
    assert(result.executionDurationMs >= 0);
  } finally {
    mockMethod.restore();
  }
});
