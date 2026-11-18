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
