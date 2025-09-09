#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { load } from '@std/dotenv';

await load({ export: true });

const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL');

if (!DISCORD_WEBHOOK_URL) {
  console.error('❌ エラー: DISCORD_WEBHOOK_URL が設定されていません');
  console.error('   .env ファイルで DISCORD_WEBHOOK_URL を設定してください');
  Deno.exit(1);
}

console.log('🧪 Discord Webhook テスト通知を送信中...');

// 現在時刻をISO8601形式で取得
const currentTime = new Date().toISOString();
const localTime = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

// テストメッセージのペイロード
const payload = {
  embeds: [{
    title: '🧪 Urawa Support Hub テスト',
    description: 'システムが正常に動作しています',
    color: 65280,
    fields: [
      {
        name: '📊 ステータス',
        value: '正常',
        inline: true,
      },
      {
        name: '⏰ 送信時刻',
        value: localTime,
        inline: true,
      },
    ],
    timestamp: currentTime,
    footer: {
      text: 'Urawa Support Hub Test',
    },
  }],
};

try {
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 204 || response.status === 200) {
    console.log('✅ Discord Webhook テスト通知が正常に送信されました');
    console.log('   Discordチャンネルでメッセージを確認してください');
  } else {
    const responseBody = await response.text();
    console.error('❌ Discord Webhook テスト通知の送信に失敗しました');
    console.error(`   HTTPステータスコード: ${response.status}`);
    console.error(`   エラー内容: ${responseBody}`);
    Deno.exit(1);
  }
} catch (error) {
  console.error('❌ Discord Webhook テスト通知でエラーが発生しました');
  console.error('   エラー:', error);
  Deno.exit(1);
}
