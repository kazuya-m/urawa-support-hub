/**
 * Cloud Tasks→Cloud Run LINE通知統合テスト
 * Issue #78: Cloud Tasks→Cloud Run LINE通知統合完全実装
 *
 * 3つの通知タイプ（day_before, hour_before, minutes_before）での
 * エンドツーエンドフローをテストする
 */

import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { load } from '@std/dotenv';

// .envファイルから環境変数を読み込み（DIコンテナより先に）
await load({ export: true });

// テスト用環境変数を設定
Deno.env.set('NODE_ENV', 'test');

import { createNotificationController } from '@/config/di.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { NOTIFICATION_TYPE_STYLES } from '@/config/notification.ts';

Deno.test('Cloud Tasks→Cloud Run 通知統合テスト', async (t) => {
  const originalFetch = globalThis.fetch;
  const lineApiRequests: any[] = [];

  // LINE APIへのリクエストのみをインターセプト
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    // LINE APIへのリクエストをインターセプト
    if (url.includes('api.line.me')) {
      lineApiRequests.push({
        url,
        method: init?.method || 'GET',
        body: init?.body ? JSON.parse(init.body.toString()) : null,
        headers: init?.headers,
      });

      // LINE APIの成功レスポンスを返す
      return new Response('{"status": "success"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Discord Webhookへのリクエストをインターセプト
    if (url.includes('discord.com/api/webhooks')) {
      // Discordの成功レスポンスを返す（204 No Content）
      return new Response(null, { status: 204 });
    }

    // その他のリクエストは本物のfetchを使う（Supabaseなど）
    return originalFetch(input, init);
  };

  // テスト用環境変数設定（ローカルSupabase含む）
  const originalEnv = {
    LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN'),
    DISCORD_WEBHOOK_URL: Deno.env.get('DISCORD_WEBHOOK_URL'),
    NODE_ENV: Deno.env.get('NODE_ENV'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };

  // 環境変数は.env.testファイルから読み込み済み

  // テスト用データの準備
  const supabaseClient = createSupabaseAdminClient();
  const ticketRepository = new TicketRepository(supabaseClient);
  const notificationRepository = new NotificationRepository(supabaseClient);

  // テスト用チケットデータ
  const testTicket = await Ticket.createNew({
    matchName: 'テスト統合試合: 浦和レッズ vs FC東京',
    matchDate: new Date('2024-03-15T19:00:00+09:00'),
    venue: '味の素スタジアム',
    saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
    ticketUrl: 'https://example.com/test-ticket',
    saleStatus: 'on_sale',
    scrapedAt: new Date(),
  });

  console.log('Created testTicket:', testTicket);
  console.log('testTicket.id:', testTicket.id);
  console.log('testTicket.matchName:', testTicket.matchName);
  console.log('testTicket.toPlainObject():', testTicket.toPlainObject());

  // テストケース: day_before通知
  await t.step('should process day_before notification with correct styling', async () => {
    // LINE APIリクエストをクリア
    lineApiRequests.length = 0;

    // テスト用チケットを保存
    const upsertResult = await ticketRepository.upsert(testTicket);
    console.log('Upsert result:', upsertResult);

    const controller = createNotificationController();

    // Cloud Tasks→Cloud Runの呼び出しをシミュレート
    const requestBody = {
      ticketId: testTicket.id,
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    const request = new Request('https://example.com/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token', // テスト環境では無視される
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);
    assertEquals(response.status, 200);

    // LINE APIへのリクエストを検証
    assertEquals(lineApiRequests.length, 1);

    const lineRequest = lineApiRequests[0];
    assertExists(lineRequest.body);

    const message = lineRequest.body.messages[0];

    // day_beforeスタイルの検証
    const dayBeforeStyle = NOTIFICATION_TYPE_STYLES.day_before;
    assertEquals(message.contents.body.contents[0].text, dayBeforeStyle.title);
    assertEquals(message.contents.body.contents[0].color, dayBeforeStyle.color);

    // LINE通知のみなので、Discordリクエストは送信されていないことを確認
    // (Discord通知はエラー時のみ)
  });

  // テストケース: hour_before通知
  await t.step('should process hour_before notification with correct styling', async () => {
    lineApiRequests.length = 0;

    const controller = createNotificationController();

    const requestBody = {
      ticketId: testTicket.id,
      notificationType: NOTIFICATION_TYPES.HOUR_BEFORE,
    };

    const request = new Request('https://example.com/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);
    assertEquals(response.status, 200);

    // hour_beforeスタイルの検証
    assertEquals(lineApiRequests.length, 1);

    const lineRequest = lineApiRequests[0];
    assertExists(lineRequest.body);

    const message = lineRequest.body.messages[0];

    const hourBeforeStyle = NOTIFICATION_TYPE_STYLES.hour_before;
    assertEquals(message.contents.body.contents[0].text, hourBeforeStyle.title);
    assertEquals(message.contents.body.contents[0].color, hourBeforeStyle.color);

    // LINE通知のみなので、Discordリクエストは送信されていないことを確認
    // (Discord通知はエラー時のみ)
  });

  // テストケース: minutes_before通知
  await t.step('should process minutes_before notification with correct styling', async () => {
    lineApiRequests.length = 0;

    const controller = createNotificationController();

    const requestBody = {
      ticketId: testTicket.id,
      notificationType: NOTIFICATION_TYPES.MINUTES_BEFORE,
    };

    const request = new Request('https://example.com/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);
    assertEquals(response.status, 200);

    // minutes_beforeスタイルの検証（最も緊急）
    assertEquals(lineApiRequests.length, 1);

    const lineRequest = lineApiRequests[0];
    assertExists(lineRequest.body);

    const message = lineRequest.body.messages[0];

    const minutesBeforeStyle = NOTIFICATION_TYPE_STYLES.minutes_before;
    assertEquals(message.contents.body.contents[0].text, minutesBeforeStyle.title);
    assertEquals(message.contents.body.contents[0].color, minutesBeforeStyle.color);

    // 緊急度の高い色（浦和レッズの赤）が使用されていることを確認
    assertEquals(message.contents.body.contents[0].color, '#DC143C');
  });

  // テストケース: 無効な通知タイプのエラーハンドリング
  await t.step('should handle invalid notification type gracefully', async () => {
    const controller = createNotificationController();

    const requestBody = {
      ticketId: testTicket.id,
      notificationType: 'invalid_type',
    };

    const request = new Request('https://example.com/api/send-notification', {
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
    assertEquals(responseBody.details, 'Invalid notificationType: invalid_type');
  });

  // テストケース: 存在しないチケットのエラーハンドリング
  await t.step('should handle non-existent ticket gracefully', async () => {
    const controller = createNotificationController();

    const requestBody = {
      ticketId: 'non-existent-ticket-id',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    const request = new Request('https://example.com/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);
    assertEquals(response.status, 500); // エラー時は500を返す

    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Notification processing failed');
    assertEquals(responseBody.details.ticketId, 'non-existent-ticket-id');
    assertEquals(responseBody.details.errorMessage, 'Ticket not found: non-existent-ticket-id');
  });

  // クリーンアップ
  try {
    // Supabaseから直接削除
    await supabaseClient.from('tickets').delete().eq('id', testTicket.id);
    const notifications = await notificationRepository.findByTicketId(testTicket.id);
    for (const notification of notifications) {
      await supabaseClient.from('notifications').delete().eq('id', notification.id);
    }
  } catch (error) {
    console.warn('Clean up failed:', error);
  }

  // 環境復元
  globalThis.fetch = originalFetch;
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  });
});
