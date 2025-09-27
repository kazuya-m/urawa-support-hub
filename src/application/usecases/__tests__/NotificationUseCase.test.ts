import { assert, assertEquals } from 'std/assert/mod.ts';
import { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import { MockNotificationService } from '@/shared/testing/mocks/MockNotificationService.ts';

Deno.test('NotificationUseCase should call NotificationService.processScheduledNotification with correct input', async () => {
  const mockNotificationService = new MockNotificationService();
  const useCase = new NotificationUseCase(mockNotificationService);

  const input: NotificationExecutionInput = {
    ticketId: 'test-ticket-123',
    notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
  };

  await useCase.execute(input);

  // Mock が正しく呼び出されたことを検証
  const processedNotifications = mockNotificationService.getProcessedNotifications();
  assertEquals(processedNotifications.length, 1);
  assertEquals(processedNotifications[0].input, input);
});

Deno.test('NotificationUseCase should handle NotificationService errors properly', async () => {
  const mockNotificationService = new MockNotificationService();
  mockNotificationService.setShouldThrowError(true, 'NotificationService failed');
  const useCase = new NotificationUseCase(mockNotificationService);

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
  const mockNotificationService = new MockNotificationService();
  const useCase = new NotificationUseCase(mockNotificationService);

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
