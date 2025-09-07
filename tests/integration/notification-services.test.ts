/**
 * 通知サービス統合テスト
 * LINE Bot と Discord Webhook の実際の動作を模擬してテスト
 */

import { assertEquals, assertExists } from 'std/assert/mod.ts';
import {
  DISCORD_EMBED_TEMPLATES,
  getNotificationConfig,
  LINE_MESSAGE_TEMPLATES,
} from '@/config/notification.ts';
import { URAWA_URL_CONFIG } from '@/config/url.ts';

// モック HTTP サーバー用の型定義
interface MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

interface MockResponse {
  status: number;
  body: string;
  headers?: Record<string, string>;
}

/**
 * HTTP リクエストをモックするためのクラス
 */
class MockHttpServer {
  private requests: MockRequest[] = [];
  private responses: Map<string, MockResponse> = new Map();

  addMockResponse(pattern: string, response: MockResponse) {
    this.responses.set(pattern, response);
  }

  getRequests(): MockRequest[] {
    return [...this.requests];
  }

  clearRequests() {
    this.requests = [];
  }

  // 実際のfetchをモック
  mockFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const headers: Record<string, string> = {};

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, init.headers);
      }
    }

    const request: MockRequest = {
      method,
      url,
      headers,
      body: init?.body?.toString(),
    };

    this.requests.push(request);

    // モックレスポンスを検索
    for (const [pattern, response] of this.responses) {
      if (url.includes(pattern)) {
        return Promise.resolve(
          new Response(
            response.status === 204 ? null : response.body,
            {
              status: response.status,
              headers: response.headers,
            },
          ),
        );
      }
    }

    // デフォルトレスポンス
    return Promise.resolve(
      new Response('{"ok": true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };
}

/**
 * LINE Bot API の模擬送信関数
 */
async function sendLineMessage(
  config: ReturnType<typeof getNotificationConfig>['line'],
  message: Record<string, unknown>,
) {
  const response = await fetch(URAWA_URL_CONFIG.staticUrls.lineApiBroadcast, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [message],
    }),
  });

  return response;
}

/**
 * Discord Webhook の模擬送信関数
 */
async function sendDiscordMessage(
  config: ReturnType<typeof getNotificationConfig>['discord'],
  embed: Record<string, unknown>,
) {
  const response = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(embed),
  });

  return response;
}

Deno.test('Notification Services Integration Tests', async (t) => {
  const originalFetch = globalThis.fetch;
  const mockServer = new MockHttpServer();

  // テスト前の環境変数設定
  const originalEnv = {
    LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN'),
    LINE_GROUP_ID: Deno.env.get('LINE_GROUP_ID'),
    DISCORD_WEBHOOK_URL: Deno.env.get('DISCORD_WEBHOOK_URL'),
    DISCORD_CHANNEL_ID: Deno.env.get('DISCORD_CHANNEL_ID'),
  };

  // テスト用環境変数を設定
  Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token-123');
  Deno.env.set('LINE_GROUP_ID', 'test-group-456');
  Deno.env.set('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/789/test-webhook');
  Deno.env.set('DISCORD_CHANNEL_ID', 'test-channel-101112');

  // モックレスポンスを設定
  mockServer.addMockResponse('api.line.me', {
    status: 200,
    body: '{"status": "success"}',
    headers: { 'Content-Type': 'application/json' },
  });

  mockServer.addMockResponse('discord.com', {
    status: 204,
    body: '',
    headers: {},
  });

  // fetchをモックに置き換え
  globalThis.fetch = mockServer.mockFetch;

  await t.step('should send LINE ticket notification successfully', async () => {
    const config = getNotificationConfig();
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      '浦和レッズ vs FC東京',
      '2024-03-15 19:00',
      '味の素スタジアム',
      '2024-03-01 10:00',
      'https://example.com/ticket',
    );

    const response = await sendLineMessage(config.line, message);

    assertEquals(response.status, 200);

    // リクエストが正しく送信されたことを確認
    const requests = mockServer.getRequests();
    const lineRequest = requests.find((request) =>
      request.url.includes('api.line.me/v2/bot/message/broadcast')
    );

    assertExists(lineRequest);
    assertEquals(lineRequest.method, 'POST');
    assertEquals(lineRequest.headers['Authorization'], 'Bearer test-line-token-123');
    assertEquals(lineRequest.headers['Content-Type'], 'application/json');

    // リクエストボディの検証
    if (!lineRequest.body) {
      throw new Error('LINE request body is missing');
    }
    const requestBody = JSON.parse(lineRequest.body);
    assertEquals(requestBody.messages[0].type, 'flex');
    assertEquals(requestBody.messages[0].altText, '【チケット通知】浦和レッズ vs FC東京');
  });

  await t.step('should send Discord ticket notification successfully', async () => {
    mockServer.clearRequests();

    const config = getNotificationConfig();
    const embed = DISCORD_EMBED_TEMPLATES.ticketNotification(
      '浦和レッズ vs FC東京',
      '2024-03-15 19:00',
      '味の素スタジアム',
      '2024-03-01 10:00',
      'https://example.com/ticket',
    );

    const response = await sendDiscordMessage(config.discord, embed);

    assertEquals(response.status, 204);

    // リクエストが正しく送信されたことを確認
    const requests = mockServer.getRequests();
    const discordRequest = requests.find((request) => request.url.includes('discord.com'));

    assertExists(discordRequest);
    assertEquals(discordRequest.method, 'POST');
    assertEquals(discordRequest.headers['Content-Type'], 'application/json');

    // リクエストボディの検証
    if (!discordRequest.body) {
      throw new Error('Discord request body is missing');
    }
    const requestBody = JSON.parse(discordRequest.body);
    assertEquals(requestBody.embeds.length, 1);
    assertEquals(requestBody.embeds[0].title, '🎫 浦和レッズ チケット販売通知');
    assertEquals(requestBody.embeds[0].color, 14431075); // 浦和レッズカラー
  });

  await t.step('should handle LINE simple message', async () => {
    mockServer.clearRequests();

    const config = getNotificationConfig();
    const message = LINE_MESSAGE_TEMPLATES.simple('テスト通知メッセージ');

    const response = await sendLineMessage(config.line, message);

    assertEquals(response.status, 200);

    const requests = mockServer.getRequests();
    const lineRequest = requests.find((request) => request.url.includes('api.line.me'));

    assertExists(lineRequest);
    if (!lineRequest.body) {
      throw new Error('LINE request body is missing');
    }
    const requestBody = JSON.parse(lineRequest.body);
    assertEquals(requestBody.messages[0].type, 'text');
    assertEquals(requestBody.messages[0].text, 'テスト通知メッセージ');
  });

  await t.step('should handle Discord system notification', async () => {
    mockServer.clearRequests();

    const config = getNotificationConfig();
    const embed = DISCORD_EMBED_TEMPLATES.systemNotification(
      'システム起動',
      'スクレイピングサービスが正常に起動しました',
    );

    const response = await sendDiscordMessage(config.discord, embed);

    assertEquals(response.status, 204);

    const requests = mockServer.getRequests();
    const discordRequest = requests.find((request) => request.url.includes('discord.com'));

    assertExists(discordRequest);
    if (!discordRequest.body) {
      throw new Error('Discord request body is missing');
    }
    const requestBody = JSON.parse(discordRequest.body);
    assertEquals(requestBody.embeds[0].title, 'システム起動');
    assertEquals(requestBody.embeds[0].description, 'スクレイピングサービスが正常に起動しました');
    assertEquals(requestBody.embeds[0].color, 65280); // 緑色
  });

  await t.step('should handle Discord error notification', async () => {
    mockServer.clearRequests();

    const config = getNotificationConfig();
    const embed = DISCORD_EMBED_TEMPLATES.errorNotification(
      'スクレイピングエラー',
      'ネットワーク接続に失敗しました',
    );

    const response = await sendDiscordMessage(config.discord, embed);

    assertEquals(response.status, 204);

    const requests = mockServer.getRequests();
    const discordRequest = requests.find((request) => request.url.includes('discord.com'));

    assertExists(discordRequest);
    if (!discordRequest.body) {
      throw new Error('Discord request body is missing');
    }
    const requestBody = JSON.parse(discordRequest.body);
    assertEquals(requestBody.embeds[0].title, '🚨 システムエラー');
    assertEquals(requestBody.embeds[0].description, 'スクレイピングエラー');
    assertEquals(requestBody.embeds[0].color, 16711680); // 赤色
    assertEquals(requestBody.embeds[0].fields[0].name, '詳細');
    assertEquals(requestBody.embeds[0].fields[0].value, 'ネットワーク接続に失敗しました');
  });

  await t.step('should handle notification config errors gracefully', () => {
    // 環境変数を一時的に削除
    Deno.env.delete('LINE_CHANNEL_ACCESS_TOKEN');

    try {
      getNotificationConfig();
      throw new Error('Should have thrown an error');
    } catch (error) {
      assertEquals(
        (error as Error).message,
        'Environment variable LINE_CHANNEL_ACCESS_TOKEN is required',
      );
    }
  });

  await t.step('should send both LINE and Discord notifications in sequence', async () => {
    mockServer.clearRequests();

    // 環境変数を再設定
    Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token-123');

    const config = getNotificationConfig();

    // チケット情報
    const ticketInfo = {
      match: '浦和レッズ vs ガンバ大阪',
      date: '2024-04-20 15:00',
      venue: 'パナソニックスタジアム吹田',
      saleStart: '2024-04-01 10:00',
      url: 'https://example.com/ticket/12345',
    };

    // LINE通知
    const lineMessage = LINE_MESSAGE_TEMPLATES.ticketNotification(
      ticketInfo.match,
      ticketInfo.date,
      ticketInfo.venue,
      ticketInfo.saleStart,
      ticketInfo.url,
    );
    const lineResponse = await sendLineMessage(config.line, lineMessage);

    // Discord通知
    const discordEmbed = DISCORD_EMBED_TEMPLATES.ticketNotification(
      ticketInfo.match,
      ticketInfo.date,
      ticketInfo.venue,
      ticketInfo.saleStart,
      ticketInfo.url,
    );
    const discordResponse = await sendDiscordMessage(config.discord, discordEmbed);

    // 両方の通知が成功したことを確認
    assertEquals(lineResponse.status, 200);
    assertEquals(discordResponse.status, 204);

    // 2つのリクエストが送信されたことを確認
    const requests = mockServer.getRequests();
    assertEquals(requests.length, 2);

    // LINE APIとDiscord Webhookへのリクエストがそれぞれ1つずつあることを確認
    const lineRequests = requests.filter((request) => request.url.includes('api.line.me'));
    const discordRequests = requests.filter((request) => request.url.includes('discord.com'));

    assertEquals(lineRequests.length, 1);
    assertEquals(discordRequests.length, 1);

    // 両方のリクエストが同じチケット情報を含んでいることを確認
    if (!lineRequests[0].body || !discordRequests[0].body) {
      throw new Error('Request bodies are missing for comparison');
    }
    const lineBody = JSON.parse(lineRequests[0].body);
    const discordBody = JSON.parse(discordRequests[0].body);

    assertEquals(lineBody.messages[0].altText, '【チケット通知】浦和レッズ vs ガンバ大阪');
    const matchField = discordBody.embeds[0].fields.find(
      (field: { name: string; value: string }) => field.name === '⚽ 試合',
    );
    assertEquals(matchField?.value, '浦和レッズ vs ガンバ大阪');
  });

  // テスト後のクリーンアップ
  globalThis.fetch = originalFetch;

  // 環境変数を復元
  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  });
});
