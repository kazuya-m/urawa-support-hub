import { assert, assertEquals } from 'std/assert/mod.ts';
import type { NotificationExecutionInput } from '@/application/usecases/results.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import type { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';

/**
 * sendScheduledNotification の呼び出しを記録する NotificationService のスタブ
 */
function createNotificationServiceStub(error?: Error) {
  const calls: NotificationExecutionInput[] = [];
  const stub = {
    sendScheduledNotification: (input: NotificationExecutionInput) => {
      calls.push(input);
      return error ? Promise.reject(error) : Promise.resolve();
    },
  } satisfies Partial<NotificationService>;
  return { service: stub as unknown as NotificationService, calls };
}

Deno.test('NotificationUseCase should call NotificationService.processScheduledNotification with correct input', async () => {
  const { service, calls } = createNotificationServiceStub();
  const useCase = new NotificationUseCase(service);

  const input: NotificationExecutionInput = {
    ticketId: 'test-ticket-123',
    notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
  };

  await useCase.execute(input);

  // スタブが正しく呼び出されたことを検証
  assertEquals(calls.length, 1);
  assertEquals(calls[0], input);
});

Deno.test('NotificationUseCase should handle NotificationService errors properly', async () => {
  const { service } = createNotificationServiceStub(new Error('NotificationService failed'));
  const useCase = new NotificationUseCase(service);

  const input: NotificationExecutionInput = {
    ticketId: 'test-ticket-123',
    notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
  };

  // エラーが発生してもresultを返すことを確認
  const result = await useCase.execute(input);

  assertEquals(result.status, 'error');
  assertEquals(result.errorMessage?.includes('NotificationService failed'), true);
});

Deno.test('NotificationUseCase should return successful result with execution time', async () => {
  const { service } = createNotificationServiceStub();
  const useCase = new NotificationUseCase(service);

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
});

Deno.test('NotificationUseCase - 失敗時のログ', async () => {
  const { service } = createNotificationServiceStub(new Error('NotificationService failed'));
  const useCase = new NotificationUseCase(service);

  // CloudLogger の出力（console.log の JSON）を捕まえる
  // stack を出さないよう production にし、Cloud Run のラベルが付かないよう K_SERVICE を消す
  const lines: string[] = [];
  const originalLog = console.log;
  const envKeys = ['NODE_ENV', 'K_SERVICE', 'K_REVISION'];
  const originalEnv = envKeys.map((key) => [key, Deno.env.get(key)] as const);
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  Deno.env.delete('K_SERVICE');
  Deno.env.delete('K_REVISION');
  try {
    await useCase.execute({
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    });
  } finally {
    console.log = originalLog;
    for (const [key, value] of originalEnv) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }

  assertEquals(lines.map((line) => JSON.parse(line)), [{
    severity: 'ERROR',
    message: 'Scheduled notification failed',
    jsonPayload: {
      category: 'NOTIFICATION',
      context: { ticketId: 'test-ticket-123', stage: 'usecase_error' },
      metadata: { notificationTypeKey: 'day_before' },
      error: { message: 'NotificationService failed', recoverable: true },
    },
  }]);
});
