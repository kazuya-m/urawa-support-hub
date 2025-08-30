import { assertEquals } from 'std/assert/mod.ts';
import { returnsNext, stub } from 'testing/mock.ts';
import { NotificationBatchController } from '@/adapters/controllers/NotificationBatchController.ts';

// テスト用環境変数を設定（Supabaseクライアント作成のため）
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
Deno.env.set('NODE_ENV', 'test'); // 認証スキップのため

Deno.test('NotificationBatchController should handle pending notifications processing', async () => {
  const controller = new NotificationBatchController();

  // NotificationBatchUseCaseのexecuteメソッドをモック化
  const mockExecute = stub(
    controller['notificationBatchUseCase'],
    'execute',
    returnsNext([Promise.resolve({ processed: 5, failed: 0 })]),
  );

  try {
    const request = new Request('http://localhost/api/process-pending-notifications', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-oidc-token',
      },
    });

    const response = await controller.handleProcessPendingNotifications(request);

    // レスポンスの検証
    assertEquals(response.status, 200);
    assertEquals(mockExecute.calls.length, 1);

    const responseBody = await response.json();
    assertEquals(responseBody.status, 'success');
    assertEquals(responseBody.processed, 5);
    assertEquals(responseBody.failed, 0);

    // 正しい引数でUseCaseが呼ばれたことを確認
    assertEquals(mockExecute.calls[0].args[0].operation, 'process_pending');
  } finally {
    mockExecute.restore();
  }
});

Deno.test('NotificationBatchController should handle cleanup expired notifications', async () => {
  const controller = new NotificationBatchController();

  // NotificationBatchUseCaseのexecuteメソッドをモック化
  const mockExecute = stub(
    controller['notificationBatchUseCase'],
    'execute',
    returnsNext([Promise.resolve({ cleaned: 3 })]),
  );

  try {
    const request = new Request('http://localhost/api/cleanup-expired', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-oidc-token',
      },
    });

    const response = await controller.handleCleanupExpiredNotifications(request);

    // レスポンスの検証
    assertEquals(response.status, 200);
    assertEquals(mockExecute.calls.length, 1);

    const responseBody = await response.json();
    assertEquals(responseBody.status, 'success');
    assertEquals(responseBody.cleaned, 3);

    // 正しい引数でUseCaseが呼ばれたことを確認
    assertEquals(mockExecute.calls[0].args[0].operation, 'cleanup_expired');
  } finally {
    mockExecute.restore();
  }
});

Deno.test('NotificationBatchController should handle UseCase errors properly', async () => {
  const controller = new NotificationBatchController();
  const testError = new Error('UseCase execution failed');

  // エラーを投げるモック
  const mockExecute = stub(
    controller['notificationBatchUseCase'],
    'execute',
    returnsNext([Promise.reject(testError)]),
  );

  try {
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
      assertEquals(mockExecute.calls.length, 1);
      return; // テスト成功
    }

    // もしエラーがスローされずにレスポンスが返された場合
    assertEquals(response.status, 500);
    assertEquals(mockExecute.calls.length, 1);

    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Pending notifications processing failed');
  } finally {
    mockExecute.restore();
  }
});

Deno.test('NotificationBatchController should handle authentication in production mode', async () => {
  // 本番環境での認証テスト
  const originalNodeEnv = Deno.env.get('NODE_ENV');
  Deno.env.set('NODE_ENV', 'production');

  try {
    const controller = new NotificationBatchController();

    const request = new Request('http://localhost/api/process-pending-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header無し
      },
    });

    const response = await controller.handleProcessPendingNotifications(request);

    assertEquals(response.status, 401);
    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Unauthorized');
  } finally {
    // 環境変数を元に戻す
    if (originalNodeEnv === undefined) {
      Deno.env.delete('NODE_ENV');
    } else {
      Deno.env.set('NODE_ENV', originalNodeEnv);
    }
  }
});
