import { assertEquals } from 'std/assert/mod.ts';
import { spy } from 'testing/mock.ts';
import { NotificationExecutionInput, NotificationUseCase } from '../NotificationUseCase.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';

Deno.test('NotificationUseCase', async (t) => {
  await t.step(
    'should call NotificationService.processScheduledNotification with correct input',
    async () => {
      const useCase = new NotificationUseCase();

      // NotificationServiceのモック作成
      let calledWith: NotificationExecutionInput | null = null;
      const mockProcessScheduledNotification = spy((input: NotificationExecutionInput) => {
        calledWith = input;
        return Promise.resolve();
      });

      // プライベートプロパティをモックに置き換え
      Object.defineProperty(useCase, 'notificationService', {
        value: {
          processScheduledNotification: mockProcessScheduledNotification,
        },
        writable: true,
      });

      const input: NotificationExecutionInput = {
        ticketId: 'test-ticket-123',
        notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
      };

      await useCase.execute(input);

      // モックが正しく呼び出されたことを検証
      assertEquals(mockProcessScheduledNotification.calls.length, 1);
      assertEquals(calledWith, input);
    },
  );

  await t.step('should handle NotificationService errors properly', async () => {
    const useCase = new NotificationUseCase();
    const testError = new Error('NotificationService failed');

    // エラーを投げるモック作成
    const mockProcessScheduledNotification = spy(() => Promise.reject(testError));

    Object.defineProperty(useCase, 'notificationService', {
      value: {
        processScheduledNotification: mockProcessScheduledNotification,
      },
      writable: true,
    });

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
    assertEquals(mockProcessScheduledNotification.calls.length, 1);
  });

  await t.step('should log execution time for successful operations', async () => {
    const useCase = new NotificationUseCase();

    // console.logをスパイ
    const originalConsoleLog = console.log;
    let loggedMessage: string | null = null;
    const logSpy = spy((message: string) => {
      loggedMessage = message;
    });
    console.log = logSpy;

    const mockProcessScheduledNotification = spy(() => Promise.resolve());
    Object.defineProperty(useCase, 'notificationService', {
      value: {
        processScheduledNotification: mockProcessScheduledNotification,
      },
      writable: true,
    });

    const input: NotificationExecutionInput = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    await useCase.execute(input);

    // ログ出力が行われたことを確認
    assertEquals(logSpy.calls.length, 1);
    assertEquals(loggedMessage, 'Scheduled notification completed successfully:');

    // console.logを復元
    console.log = originalConsoleLog;
  });
});
