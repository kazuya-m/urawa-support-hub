import { assertEquals } from 'std/assert/mod.ts';
import { NotificationBatchController } from '@/adapters/controllers/NotificationBatchController.ts';
import { MockNotificationBatchUseCase } from '@/shared/testing/mocks/MockNotificationBatchUseCase.ts';

Deno.env.set('NODE_ENV', 'test');

Deno.test('NotificationBatchController should handle pending notifications processing', async () => {
  const mockUseCase = new MockNotificationBatchUseCase();
  mockUseCase.setMockResults([{
    status: 'success' as const,
    operation: 'process_pending' as const,
    processed: 5,
    failed: 0,
    executionDurationMs: 1000,
  }]);

  const controller = new NotificationBatchController(mockUseCase);

  const request = new Request('http://localhost/api/process-pending-notifications', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-oidc-token',
    },
  });

  const response = await controller.handleProcessPendingNotifications(request);

  assertEquals(response.status, 200);

  const responseBody = await response.json();
  assertEquals(responseBody.status, 'success');
  assertEquals(responseBody.processed, 5);
  assertEquals(responseBody.failed, 0);

  const executedInputs = mockUseCase.getExecutedInputs();
  assertEquals(executedInputs.length, 1);
  assertEquals(executedInputs[0].operation, 'process_pending');
});

Deno.test('NotificationBatchController should handle cleanup expired notifications', async () => {
  const mockUseCase = new MockNotificationBatchUseCase();
  mockUseCase.setMockResults([{
    status: 'success' as const,
    operation: 'cleanup_expired' as const,
    cleaned: 3,
    executionDurationMs: 500,
  }]);

  const controller = new NotificationBatchController(mockUseCase);

  const request = new Request('http://localhost/api/cleanup-expired', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-oidc-token',
    },
  });

  const response = await controller.handleCleanupExpiredNotifications(request);

  assertEquals(response.status, 200);

  const responseBody = await response.json();
  assertEquals(responseBody.status, 'success');
  assertEquals(responseBody.cleaned, 3);

  const executedInputs = mockUseCase.getExecutedInputs();
  assertEquals(executedInputs.length, 1);
  assertEquals(executedInputs[0].operation, 'cleanup_expired');
});

Deno.test('NotificationBatchController should handle UseCase errors properly', async () => {
  const mockUseCase = new MockNotificationBatchUseCase();
  mockUseCase.setShouldThrowError(true, 'UseCase execution failed');

  const controller = new NotificationBatchController(mockUseCase);

  const request = new Request('http://localhost/api/process-pending-notifications', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-oidc-token',
    },
  });

  let response: Response;
  try {
    response = await controller.handleProcessPendingNotifications(request);
  } catch (error) {
    // handleSupabaseErrorが投げるRepositoryErrorをキャッチ
    // エラーが適切に処理されていることを確認
    assertEquals(error instanceof Error, true);
    const errorMessage = (error as Error).message;
    assertEquals(errorMessage.includes('UseCase execution failed'), true);

    // ユースケースが実行されたかどうかはエラーのタイミングに依存する
    // エラーが正しくスローされたことだけを確認
    return; // テスト成功
  }

  // もしエラーがスローされずにレスポンスが返された場合
  assertEquals(response.status, 500);

  const responseBody = await response.json();
  assertEquals(responseBody.error, 'Pending notifications processing failed');
});
