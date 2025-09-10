/**
 * 通知サービス設定のユニットテスト
 */

import { assertEquals, assertThrows } from 'std/assert/mod.ts';
import {
  DISCORD_EMBED_TEMPLATES,
  type DiscordConfig,
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

  await t.step('DiscordConfig should have required properties', () => {
    const config: DiscordConfig = {
      webhookUrl: 'https://discord.com/api/webhooks/test',
      channelId: 'test-channel-id',
    };

    assertEquals(typeof config.webhookUrl, 'string');
    assertEquals(typeof config.channelId, 'string');
  });

  await t.step('DiscordConfig channelId should be optional', () => {
    const config: DiscordConfig = {
      webhookUrl: 'https://discord.com/api/webhooks/test',
    };

    assertEquals(config.channelId, undefined);
  });

  await t.step('NotificationServiceConfig should combine both configs', () => {
    const config: NotificationServiceConfig = {
      line: {
        channelAccessToken: 'line-token',
      },
      discord: {
        webhookUrl: 'https://discord.com/api/webhooks/test',
        channelId: 'discord-channel',
      },
    };

    assertEquals(config.line.channelAccessToken, 'line-token');
    assertEquals(config.discord.webhookUrl, 'https://discord.com/api/webhooks/test');
  });
});

Deno.test('getNotificationConfig function', async (t) => {
  const originalEnv = {
    LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN'),
    DISCORD_WEBHOOK_URL: Deno.env.get('DISCORD_WEBHOOK_URL'),
    DISCORD_CHANNEL_ID: Deno.env.get('DISCORD_CHANNEL_ID'),
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
    Deno.env.set('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/test');
    Deno.env.set('DISCORD_CHANNEL_ID', 'test-discord-channel');

    const config = getNotificationConfig();

    assertEquals(config.line.channelAccessToken, 'test-line-token');
    assertEquals(config.discord.webhookUrl, 'https://discord.com/api/webhooks/test');
    assertEquals(config.discord.channelId, 'test-discord-channel');

    restoreEnv();
  });

  await t.step('should work with optional DISCORD_CHANNEL_ID', () => {
    // 必須の環境変数のみ設定
    Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token');
    Deno.env.set('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/test');
    Deno.env.delete('DISCORD_CHANNEL_ID');

    const config = getNotificationConfig();

    assertEquals(config.discord.channelId, undefined);

    restoreEnv();
  });

  await t.step('should throw error when LINE_CHANNEL_ACCESS_TOKEN is missing', () => {
    Deno.env.delete('LINE_CHANNEL_ACCESS_TOKEN');
    Deno.env.set('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/test');

    assertThrows(
      () => getNotificationConfig(),
      Error,
      'Environment variable LINE_CHANNEL_ACCESS_TOKEN is required',
    );

    restoreEnv();
  });

  await t.step('should throw error when DISCORD_WEBHOOK_URL is missing', () => {
    Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token');
    Deno.env.delete('DISCORD_WEBHOOK_URL');

    assertThrows(
      () => getNotificationConfig(),
      Error,
      'Environment variable DISCORD_WEBHOOK_URL is required',
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

Deno.test('DISCORD_EMBED_TEMPLATES', async (t) => {
  await t.step('systemNotification template should create embed with custom color', () => {
    const embed = DISCORD_EMBED_TEMPLATES.systemNotification(
      '🎫 チケット販売通知',
      '浦和レッズ vs FC東京\n📅 2024-03-15 19:00\n📍 味の素スタジアム\n🚀 販売開始: 2024-03-01 10:00',
      51281, // day_before green color
    );

    assertEquals(embed.embeds.length, 1);
    assertEquals(embed.embeds[0].title, '🎫 チケット販売通知');
    assertEquals(embed.embeds[0].color, 51281);
    assertEquals(embed.embeds[0].footer.text, 'Urawa Support Hub System');
  });

  await t.step('systemNotification template should work with basic parameters', () => {
    const embed = DISCORD_EMBED_TEMPLATES.systemNotification(
      'システム通知',
      '処理が完了しました',
    );

    assertEquals(embed.embeds[0].color, 65280); // default green
  });

  await t.step('systemNotification template should create system embed', () => {
    const embed = DISCORD_EMBED_TEMPLATES.systemNotification(
      'システム起動',
      'スクレイピングサービスが正常に起動しました',
      65280,
    );

    assertEquals(embed.embeds[0].title, 'システム起動');
    assertEquals(embed.embeds[0].description, 'スクレイピングサービスが正常に起動しました');
    assertEquals(embed.embeds[0].color, 65280);
    assertEquals(embed.embeds[0].footer.text, 'Urawa Support Hub System');
  });

  await t.step('systemNotification template should use default color', () => {
    const embed = DISCORD_EMBED_TEMPLATES.systemNotification(
      'テスト',
      'テストメッセージ',
    );

    assertEquals(embed.embeds[0].color, 65280); // デフォルト緑色
  });

  await t.step('errorNotification template should create error embed', () => {
    const embed = DISCORD_EMBED_TEMPLATES.errorNotification(
      'スクレイピングエラー',
      'ネットワーク接続に失敗しました',
    );

    assertEquals(embed.embeds[0].title, '🚨 システムエラー');
    assertEquals(embed.embeds[0].description, 'スクレイピングエラー');
    assertEquals(embed.embeds[0].color, 16711680); // 赤色
    assertEquals(embed.embeds[0].fields?.length, 1);
    assertEquals(embed.embeds[0].fields?.[0].name, '詳細');
    assertEquals(embed.embeds[0].fields?.[0].value, 'ネットワーク接続に失敗しました');
    assertEquals(embed.embeds[0].footer.text, 'Urawa Support Hub Error Alert');
  });

  await t.step('errorNotification template should work without details', () => {
    const embed = DISCORD_EMBED_TEMPLATES.errorNotification('一般的なエラー');

    assertEquals(embed.embeds[0].fields, undefined);
  });

  await t.step('all embed templates should have timestamp', () => {
    const now = new Date();

    const ticketEmbed = DISCORD_EMBED_TEMPLATES.systemNotification(
      'Test Notification',
      'Test Description',
    );
    const systemEmbed = DISCORD_EMBED_TEMPLATES.systemNotification('title', 'desc');
    const errorEmbed = DISCORD_EMBED_TEMPLATES.errorNotification('error');

    // タイムスタンプが現在時刻に近いことを確認（5秒以内の誤差を許可）
    [ticketEmbed, systemEmbed, errorEmbed].forEach((embed) => {
      const timestamp = new Date(embed.embeds[0].timestamp);
      const diff = Math.abs(timestamp.getTime() - now.getTime());
      assertEquals(diff < 5000, true, `Timestamp should be close to now: ${diff}ms`);
    });
  });
});
