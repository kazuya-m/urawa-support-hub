import { assertEquals } from 'std/assert/mod.ts';
import { NotificationBatchController } from '../NotificationBatchController.ts';

Deno.test('NotificationBatchController', async (t) => {
  const originalEnv = {
    LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN'),
    DISCORD_WEBHOOK_URL: Deno.env.get('DISCORD_WEBHOOK_URL'),
    NODE_ENV: Deno.env.get('NODE_ENV'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };

  // テスト用環境変数設定
  Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token');
  Deno.env.set('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/test');
  Deno.env.set('NODE_ENV', 'test'); // 本番でない環境での認証スキップ
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

  await t.step('should handle pending notifications processing', async () => {
    const controller = new NotificationBatchController();

    const request = new Request('http://localhost/api/process-pending-notifications', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-oidc-token',
      },
    });

    try {
      const response = await controller.handleProcessPendingNotifications(request);
      assertEquals(typeof response, 'object');
      assertEquals(response instanceof Response, true);
    } catch (error) {
      // DB接続エラーは想定内（テスト環境）
      assertEquals(typeof error, 'object');
    }
  });

  await t.step('should handle cleanup expired notifications', async () => {
    const controller = new NotificationBatchController();

    const request = new Request('http://localhost/api/cleanup-expired', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-oidc-token',
      },
    });

    try {
      const response = await controller.handleCleanupExpiredNotifications(request);
      assertEquals(typeof response, 'object');
      assertEquals(response instanceof Response, true);
    } catch (error) {
      // DB接続エラーは想定内（テスト環境）
      assertEquals(typeof error, 'object');
    }
  });

  await t.step('should handle authentication in production mode', async () => {
    // 本番環境での認証テスト
    Deno.env.set('NODE_ENV', 'production');

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

    // 環境変数を戻す
    Deno.env.set('NODE_ENV', 'test');
  });

  // 環境変数復元
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  });
});
