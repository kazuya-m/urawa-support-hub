/**
 * 通知サービス設定
 * LINE Bot および Discord Webhook の設定値管理
 */

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

  // 必須環境変数のチェック
  for (const envVar of requiredEnvVars) {
    if (!Deno.env.get(envVar)) {
      throw new Error(`Environment variable ${envVar} is required`);
    }
  }

  return {
    line: {
      channelAccessToken: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!,
    },
    discord: {
      webhookUrl: Deno.env.get('DISCORD_WEBHOOK_URL')!,
      channelId: Deno.env.get('DISCORD_CHANNEL_ID'),
    },
  };
}

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
   * チケット販売通知メッセージ（Flex Message）
   */
  ticketNotification: (
    match: string,
    date: string,
    venue: string,
    saleStart: string,
    url?: string,
  ) => ({
    type: 'flex' as const,
    altText: `【チケット通知】${match}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎫 チケット販売通知',
            weight: 'bold',
            size: 'lg',
            color: '#DC143C',
          },
          {
            type: 'text',
            text: match,
            size: 'md',
            margin: 'sm',
          },
          {
            type: 'text',
            text: `⚽ ${date}`,
            size: 'sm',
            color: '#666666',
          },
          {
            type: 'text',
            text: `🏟️ ${venue}`,
            size: 'sm',
            color: '#666666',
          },
          {
            type: 'text',
            text: `🚀 販売開始: ${saleStart}`,
            size: 'md',
            weight: 'bold',
            color: '#DC143C',
            margin: 'md',
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
              color: '#DC143C',
            },
          ],
        }
        : undefined,
    },
  }),
};

/**
 * Discord Embed テンプレート
 */
export const DISCORD_EMBED_TEMPLATES = {
  /**
   * チケット販売通知 Embed
   */
  ticketNotification: (
    match: string,
    date: string,
    venue: string,
    saleStart: string,
    url?: string,
  ) => ({
    embeds: [
      {
        title: '🎫 浦和レッズ チケット販売通知',
        description: 'アウェイマッチのチケット販売が開始されます',
        color: 14431075, // 浦和レッズカラー (#DC143C)
        fields: [
          {
            name: '⚽ 試合',
            value: match,
            inline: true,
          },
          {
            name: '📅 日時',
            value: date,
            inline: true,
          },
          {
            name: '🏟️ 会場',
            value: venue,
            inline: true,
          },
          {
            name: '🚀 販売開始',
            value: saleStart,
            inline: false,
          },
        ],
        url: url,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Urawa Support Hub',
        },
      },
    ],
  }),

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
