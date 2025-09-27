/**
 * 通知サービス設定
 * LINE Bot の設定値管理
 */

import { NotificationType } from '@/domain/config/NotificationConfig.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { formatJST } from '@/shared/utils/datetime.ts';
import { formatMatchName } from '@/shared/utils/match.ts';

export interface LineConfig {
  channelAccessToken: string;
}

export interface NotificationServiceConfig {
  line: LineConfig;
}

/**
 * 環境変数から通知サービス設定を取得
 */
export function getNotificationConfig(): NotificationServiceConfig {
  const requiredEnvVars = [
    'LINE_CHANNEL_ACCESS_TOKEN',
  ];

  for (const envVar of requiredEnvVars) {
    if (!Deno.env.get(envVar)) {
      throw new Error(`Environment variable ${envVar} is required`);
    }
  }

  const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

  if (!lineToken) {
    throw new Error('Required environment variables are not set');
  }

  return {
    line: {
      channelAccessToken: lineToken,
    },
  };
}

/**
 * 通知タイプ別の色とメッセージ設定
 */
export const NOTIFICATION_TYPE_STYLES = {
  day_before: {
    color: '#00C851', // 緑（安全・余裕あり）
    title: '✅ 明日販売開始',
    urgency: '明日',
  },
  hour_before: {
    color: '#E6B800', // 濃い黄色（視認性向上）
    title: '⚠️ 1時間後に販売開始',
    urgency: '1時間後',
  },
  minutes_before: {
    color: '#DC143C', // 浦和レッズの赤色（緊急・危険）
    title: '🚨 まもなく販売開始',
    urgency: '15分後',
  },
} as const satisfies Record<NotificationType, {
  color: string;
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
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: style.title,
              weight: 'bold',
              size: 'lg',
              color: style.color,
              align: 'center',
            },
            {
              type: 'separator',
              margin: 'md',
            },
          ],
          paddingAll: 'lg',
          backgroundColor: '#FFFFFF',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingTop: 'none',
          contents: [
            {
              type: 'text',
              text: `⚽️ ${match}`,
              size: 'md',
              margin: 'none',
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
              margin: 'lg',
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

  /**
   * チケット一覧送信メッセージ
   */
  ticketSummary: (tickets: Ticket[]) => {
    if (tickets.length === 0) {
      return {
        type: 'flex' as const,
        altText: '現在販売中・販売予定のチケットはありません',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '🎫 チケット情報',
                weight: 'bold',
                size: 'lg',
                color: '#D32F2F',
                align: 'center',
              },
              {
                type: 'text',
                text: `${formatJST(new Date(), 'M月d日')} 現在`,
                size: 'xs',
                color: '#333333',
                align: 'center',
                margin: 'xs',
              },
              {
                type: 'separator',
                margin: 'md',
              },
            ],
            paddingAll: 'lg',
            backgroundColor: '#FFFFFF',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '📅 現在販売中・販売予定のチケットはありません。',
                margin: 'none',
                wrap: true,
                align: 'center',
              },
            ],
          },
        },
      };
    }

    // 販売中と販売予定に分類
    const onSaleTickets = tickets.filter((ticket) => ticket.saleStatus === 'on_sale');
    const beforeSaleTickets = tickets.filter((ticket) => ticket.saleStatus === 'before_sale');

    const bubbles = [];

    // 販売中チケット用のBubble
    if (onSaleTickets.length > 0) {
      const onSaleContents = onSaleTickets.map((ticket, index) => {
        const matchDate = formatJST(ticket.matchDate, 'M/d(E) HH:mm');

        return [
          ...(index > 0 ? [{ type: 'separator' as const, margin: 'lg' as const }] : []),
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            spacing: 'sm',
            contents: [
              {
                type: 'text' as const,
                text: `⚽️ ${formatMatchName(ticket)}`,
                weight: 'bold' as const,
                size: 'sm' as const,
                margin: index > 0 ? 'md' as const : 'none' as const,
                wrap: true,
              },
              {
                type: 'text' as const,
                text: `📅 ${matchDate} キックオフ`,
                size: 'xs' as const,
                color: '#666666',
                margin: 'none' as const,
              },
              ...(ticket.venue
                ? [{
                  type: 'text' as const,
                  text: `📍 ${ticket.venue}`,
                  size: 'xs' as const,
                  color: '#666666',
                  margin: 'none' as const,
                }]
                : []),
              ...(ticket.ticketUrl
                ? [{
                  type: 'text' as const,
                  text: '🎫 チケット購入',
                  size: 'xs' as const,
                  color: '#0066CC',
                  margin: 'none' as const,
                  action: {
                    type: 'uri' as const,
                    uri: ticket.ticketUrl,
                  },
                }]
                : []),
            ],
          },
        ];
      }).flat();

      bubbles.push({
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🟢 販売中チケット',
              weight: 'bold',
              size: 'lg',
              color: '#1B5E20',
              align: 'center',
            },
            {
              type: 'text',
              text: `${formatJST(new Date(), 'M月d日')} 現在`,
              size: 'xs',
              color: '#333333',
              align: 'center',
              margin: 'xs',
            },
            {
              type: 'separator',
              margin: 'md',
            },
          ],
          paddingAll: 'lg',
          backgroundColor: '#FFFFFF',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingTop: 'none',
          contents: [
            ...onSaleContents,
          ],
        },
      });
    }

    // 販売予定チケット用のBubble
    if (beforeSaleTickets.length > 0) {
      const beforeSaleContents = beforeSaleTickets.map((ticket, index) => {
        const matchDate = formatJST(ticket.matchDate, 'M/d(E) HH:mm');
        const saleStartText = ticket.saleStartDate
          ? formatJST(ticket.saleStartDate, 'M/d HH:mm')
          : '未定';

        return [
          ...(index > 0 ? [{ type: 'separator' as const, margin: 'lg' as const }] : []),
          {
            type: 'box' as const,
            layout: 'vertical' as const,
            spacing: 'sm',
            contents: [
              {
                type: 'text' as const,
                text: `⚽️ ${formatMatchName(ticket)}`,
                weight: 'bold' as const,
                size: 'sm' as const,
                margin: index > 0 ? 'md' as const : 'none' as const,
                wrap: true,
              },
              {
                type: 'text' as const,
                text: `📅 ${matchDate} キックオフ`,
                size: 'xs' as const,
                color: '#666666',
                margin: 'none' as const,
              },
              ...(ticket.venue
                ? [{
                  type: 'text' as const,
                  text: `📍 ${ticket.venue}`,
                  size: 'xs' as const,
                  color: '#666666',
                  margin: 'none' as const,
                }]
                : []),
              {
                type: 'text' as const,
                text: `🚀 ${saleStartText} 販売開始`,
                size: 'xs' as const,
                color: '#DC143C',
                margin: 'lg' as const,
              },
              ...(ticket.ticketUrl
                ? [{
                  type: 'text' as const,
                  text: '🎫 詳細確認',
                  size: 'xs' as const,
                  color: '#0066CC',
                  margin: 'none' as const,
                  action: {
                    type: 'uri' as const,
                    uri: ticket.ticketUrl,
                  },
                }]
                : []),
            ],
          },
        ];
      }).flat();

      bubbles.push({
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔵 販売予定チケット',
              weight: 'bold',
              size: 'lg',
              color: '#1565C0',
              align: 'center',
            },
            {
              type: 'text',
              text: `${formatJST(new Date(), 'M月d日')} 現在`,
              size: 'xs',
              color: '#333333',
              align: 'center',
              margin: 'xs',
            },
            {
              type: 'separator',
              margin: 'md',
            },
          ],
          paddingAll: 'lg',
          backgroundColor: '#FFFFFF',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingTop: 'none',
          contents: [
            ...beforeSaleContents,
          ],
        },
      });
    }

    return {
      type: 'flex' as const,
      altText:
        `🎫 チケット一覧 (販売中${onSaleTickets.length}件、販売予定${beforeSaleTickets.length}件)`,
      contents: bubbles.length === 1 ? bubbles[0] : {
        type: 'carousel',
        contents: bubbles,
      },
    };
  },
};
