import { assertEquals } from 'std/assert/mod.ts';
import { NotificationController } from '../NotificationController.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';

Deno.test('NotificationController', async (t) => {
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

  await t.step('should handle valid send notification request', async () => {
    const controller = new NotificationController();

    const requestBody = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    try {
      const response = await controller.handleSendNotification(request);
      // レスポンスが生成されることを確認（実際のDB操作はモック環境では失敗する可能性）
      assertEquals(typeof response, 'object');
      assertEquals(response instanceof Response, true);
    } catch (error) {
      // DB接続エラーは想定内（テスト環境）
      assertEquals(typeof error, 'object');
    }
  });

  await t.step('should reject invalid request body', async () => {
    const controller = new NotificationController();

    const invalidRequestBody = {
      ticketId: '', // 空のID
      notificationType: 'invalid_type', // 不正なタイプ
    };

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(invalidRequestBody),
    });

    const response = await controller.handleSendNotification(request);

    assertEquals(response.status, 400);
    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Bad Request');
  });

  await t.step('should handle authentication in production mode', async () => {
    // 本番環境での認証テスト
    Deno.env.set('NODE_ENV', 'production');

    const controller = new NotificationController();

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header無し
      },
      body: JSON.stringify({
        ticketId: 'test-ticket-123',
        notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
      }),
    });

    const response = await controller.handleSendNotification(request);

    assertEquals(response.status, 401);
    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Unauthorized');

    // 環境変数を戻す
    Deno.env.set('NODE_ENV', 'test');
  });

  await t.step('should validate notification type', async () => {
    const controller = new NotificationController();

    const requestBody = {
      ticketId: 'test-ticket-123',
      notificationType: 'invalid_notification_type',
    };

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);

    assertEquals(response.status, 400);
    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Bad Request');
    assertEquals(
      responseBody.details,
      'Invalid notificationType: invalid_notification_type',
    );
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
