/**
 * 通知サービス設定
 * LINE Bot および Discord Webhook の設定値管理
 */

import { NotificationType } from '@/domain/entities/NotificationTypes.ts';

export interface LineConfig {
  channelAccessToken: string;
}

export interface DiscordConfig {
  webhookUrl: string;
  channelId?: string;
}

export interface NotificationServiceConfig {
  line: LineConfig;
  discord: DiscordConfig;
}

/**
 * 環境変数から通知サービス設定を取得
 */
export function getNotificationConfig(): NotificationServiceConfig {
  const requiredEnvVars = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'DISCORD_WEBHOOK_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (!Deno.env.get(envVar)) {
      throw new Error(`Environment variable ${envVar} is required`);
    }
  }

  const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
  const discordUrl = Deno.env.get('DISCORD_WEBHOOK_URL');

  if (!lineToken || !discordUrl) {
    throw new Error('Required environment variables are not set');
  }

  return {
    line: {
      channelAccessToken: lineToken,
    },
    discord: {
      webhookUrl: discordUrl,
      channelId: Deno.env.get('DISCORD_CHANNEL_ID'),
    },
  };
}

/**
 * 通知タイプ別の色とメッセージ設定
 */
export const NOTIFICATION_TYPE_STYLES = {
  day_before: {
    color: '#00C851', // 緑（安全・余裕あり）
    discordColor: 51281, // 0x00C851
    title: '✅ 明日販売開始',
    urgency: '明日',
  },
  hour_before: {
    color: '#E6B800', // 濃い黄色（視認性向上）
    discordColor: 15055872, // 0xE6B800
    title: '⚠️ 1時間後に販売開始',
    urgency: '1時間後',
  },
  minutes_before: {
    color: '#DC143C', // 浦和レッズの赤色（緊急・危険）
    discordColor: 14423100, // 0xDC143C
    title: '🚨 まもなく販売開始',
    urgency: '15分後',
  },
} as const satisfies Record<NotificationType, {
  color: string;
  discordColor: number;
  title: string;
  urgency: string;
}>;

/**
 * LINE メッセージテンプレート
 */
export const LINE_MESSAGE_TEMPLATES = {
  /**
   * シンプルテキストメッセージ
   */
  simple: (text: string) => ({
    type: 'text' as const,
    text,
  }),

  /**
   * チケット販売通知メッセージ（通知タイプ別）
   */
  ticketNotification: (
    match: string,
    date: string,
    venue: string,
    saleStart: string,
    notificationType: NotificationType,
    url?: string,
  ) => {
    const style = NOTIFICATION_TYPE_STYLES[notificationType];

    return {
      type: 'flex' as const,
      altText: `【チケット販売通知】${match}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: style.title,
              weight: 'bold',
              size: 'lg',
              color: style.color,
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'text',
              text: `⚽️ ${match}`,
              size: 'md',
              margin: 'md',
            },
            {
              type: 'text',
              text: `📅 ${date}`,
              size: 'sm',
              color: '#666666',
              margin: 'sm',
            },
            {
              type: 'text',
              text: `📍 ${venue}`,
              size: 'sm',
              color: '#666666',
              margin: 'sm',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'text',
              text: `🚀 販売開始: ${saleStart}`,
              size: 'md',
              weight: 'bold',
              color: style.color,
              margin: 'md',
            },
            {
              type: 'text',
              text: `⏰ ${style.urgency}販売開始`,
              size: 'md',
              weight: 'bold',
              color: style.color,
              margin: 'sm',
            },
          ],
        },
        footer: url
          ? {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: 'チケット購入ページ',
                  uri: url,
                },
                style: 'primary',
                color: style.color,
              },
            ],
          }
          : undefined,
      },
    };
  },
};

/**
 * Discord Embed テンプレート（エラー・システムログ用）
 */
export const DISCORD_EMBED_TEMPLATES = {
  /**
   * システム通知 Embed
   */
  systemNotification: (title: string, description: string, color: number = 65280) => ({
    embeds: [
      {
        title,
        description,
        color,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Urawa Support Hub System',
        },
      },
    ],
  }),

  /**
   * エラー通知 Embed
   */
  errorNotification: (error: string, details?: string) => ({
    embeds: [
      {
        title: '🚨 システムエラー',
        description: error,
        color: 16711680, // 赤色 (#FF0000)
        fields: details
          ? [
            {
              name: '詳細',
              value: details,
              inline: false,
            },
          ]
          : undefined,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Urawa Support Hub Error Alert',
        },
      },
    ],
  }),
};
