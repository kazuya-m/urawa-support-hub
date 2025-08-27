#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * LINE Bot ブロードキャスト配信テストスクリプト（チケット通知形式）
 * Usage: deno run --allow-env --allow-net --allow-read scripts/test-line-broadcast.ts
 */

import { load } from 'std/dotenv/mod.ts';

// .envファイルの読み込み
try {
  await load({ export: true });
} catch {
  // .envファイル読み込みエラーは無視（環境変数が直接設定されている場合もある）
}

// 必要な環境変数のチェック
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error('❌ エラー: LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
  console.error('   .env ファイルで LINE_CHANNEL_ACCESS_TOKEN を設定してください');
  Deno.exit(1);
}

console.log('🎫 LINE Bot チケット通知テスト配信中...');

// API エンドポイント
import { URAWA_URL_CONFIG } from '../src/config/url-config.ts';
const BROADCAST_API = URAWA_URL_CONFIG.staticUrls.lineApiBroadcast;

// 実際のチケット通知メッセージ（Flex Message形式）
const ticketMessage = {
  type: 'flex',
  altText: '【チケット販売通知】XXX vs 浦和レッズ',
  contents: {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🎫 チケット販売開始通知',
          weight: 'bold',
          size: 'lg',
          color: '#DC143C',
        },
        {
          type: 'separator',
          margin: 'md',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '⚽',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 1,
                },
                {
                  type: 'text',
                  text: 'XXX vs 浦和レッズ',
                  wrap: true,
                  color: '#666666',
                  size: 'md',
                  flex: 5,
                  weight: 'bold',
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '📅',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 1,
                },
                {
                  type: 'text',
                  text: 'XXXX年XX月XX日(X) XX:XX',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 5,
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '🏟️',
                  color: '#aaaaaa',
                  size: 'sm',
                  flex: 1,
                },
                {
                  type: 'text',
                  text: 'XXXスタジアム',
                  wrap: true,
                  color: '#666666',
                  size: 'sm',
                  flex: 5,
                },
              ],
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'box',
              layout: 'baseline',
              spacing: 'sm',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: '🚀',
                  color: '#DC143C',
                  size: 'md',
                  flex: 1,
                },
                {
                  type: 'text',
                  text: '販売開始: XXXX年XX月XX日(X) XX:XX',
                  wrap: true,
                  color: '#DC143C',
                  size: 'md',
                  flex: 5,
                  weight: 'bold',
                },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: {
            type: 'uri',
            label: 'チケット購入ページ',
            uri: 'https://www.jleague-ticket.jp/',
          },
          color: '#DC143C',
        },
        {
          type: 'spacer',
          size: 'sm',
        },
      ],
    },
  },
};

try {
  const response = await fetch(BROADCAST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messages: [ticketMessage],
    }),
  });

  const responseText = await response.text();

  if (response.ok && (responseText === '{}' || responseText.includes('sentMessages'))) {
    console.log('✅ チケット通知配信成功！LINEアプリでメッセージを確認してください。');
  } else {
    console.error('❌ 配信失敗:', responseText);
    Deno.exit(1);
  }
} catch (error) {
  console.error('❌ エラー:', error instanceof Error ? error.message : String(error));
  Deno.exit(1);
}
