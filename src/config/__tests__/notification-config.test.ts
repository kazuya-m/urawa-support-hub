/**
 * 通知サービス設定のユニットテスト
 */

import { assertEquals, assertThrows } from 'std/assert/mod.ts';
import {
  getNotificationConfig,
  LINE_MESSAGE_TEMPLATES,
  type LineConfig,
  type NotificationServiceConfig,
} from '../notification.ts';

Deno.test('NotificationServiceConfig interfaces', async (t) => {
  await t.step('LineConfig should have required properties', () => {
    const config: LineConfig = {
      channelAccessToken: 'test-token',
    };

    assertEquals(typeof config.channelAccessToken, 'string');
  });

  await t.step('NotificationServiceConfig should contain LINE config', () => {
    const config: NotificationServiceConfig = {
      line: {
        channelAccessToken: 'line-token',
      },
    };

    assertEquals(config.line.channelAccessToken, 'line-token');
  });
});

Deno.test('getNotificationConfig function', async (t) => {
  const originalEnv = {
    LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN'),
  };

  // テスト後に環境変数を復元
  const restoreEnv = () => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    });
  };

  await t.step('should return config when all required env vars are set', () => {
    // テスト用環境変数を設定
    Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token');

    const config = getNotificationConfig();

    assertEquals(config.line.channelAccessToken, 'test-line-token');

    restoreEnv();
  });

  await t.step('should throw error when LINE_CHANNEL_ACCESS_TOKEN is missing', () => {
    Deno.env.delete('LINE_CHANNEL_ACCESS_TOKEN');

    assertThrows(
      () => getNotificationConfig(),
      Error,
      'Environment variable LINE_CHANNEL_ACCESS_TOKEN is required',
    );

    restoreEnv();
  });
});

Deno.test('LINE_MESSAGE_TEMPLATES', async (t) => {
  await t.step('simple template should create text message', () => {
    const message = LINE_MESSAGE_TEMPLATES.simple('テストメッセージ');

    assertEquals(message.type, 'text');
    assertEquals(message.text, 'テストメッセージ');
  });

  await t.step('ticketNotification template should create flex message', () => {
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      '浦和レッズ vs FC東京',
      '2024-03-15 19:00',
      '味の素スタジアム',
      '2024-03-01 10:00',
      'day_before',
      'https://example.com/ticket',
    );

    assertEquals(message.type, 'flex');
    assertEquals(message.altText, '【チケット販売通知】浦和レッズ vs FC東京');
    assertEquals(message.contents.type, 'bubble');
    assertEquals(message.contents.body.type, 'box');
    assertEquals(message.contents.body.layout, 'vertical');

    // フッターにボタンが含まれていることを確認
    assertEquals(message.contents.footer?.type, 'box');
    assertEquals(message.contents.footer?.contents[0].type, 'button');
  });

  await t.step('ticketNotification template should work without URL', () => {
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      '浦和レッズ vs FC東京',
      '2024-03-15 19:00',
      '味の素スタジアム',
      '2024-03-01 10:00',
      'day_before',
    );

    assertEquals(message.contents.footer, undefined);
  });

  await t.step('ticketNotification template should have correct colors', () => {
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      'Test Match',
      '2024-03-15',
      'Test Venue',
      '2024-03-01',
      'day_before',
    );

    const contents = message.contents.body.contents;
    // タイトルが緑色（day_before）であることを確認
    assertEquals(contents[0].color, '#00C851');
    // 販売開始日時が緑色（day_before）であることを確認
    const saleStartText = contents.find((c: unknown) =>
      typeof c === 'object' && c !== null && 'text' in c &&
      typeof c.text === 'string' && c.text.includes('販売開始:')
    );
    assertEquals((saleStartText as { color?: string })?.color, '#00C851');
  });
});
