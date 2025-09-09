#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { load } from '@std/dotenv';

await load({ export: true });

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_WEBHOOK_URL');

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error('❌ エラー: LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
  Deno.exit(1);
}

console.log('🔍 LINE Webhook設定デバッグ');
console.log('');

// Bot情報を取得
console.log('📋 Bot情報取得中...');
const LINE_API_INFO_URL = 'https://api.line.me/v2/bot/info';

try {
  const response = await fetch(LINE_API_INFO_URL, {
    headers: {
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  if (response.ok) {
    const botInfo = await response.json();
    console.log(JSON.stringify(botInfo, null, 2));
  } else {
    console.error(`❌ API エラー: ${response.status} ${response.statusText}`);
    const error = await response.text();
    console.error(error);
  }
} catch (error) {
  console.error('❌ リクエストエラー:', error);
}

console.log('\n');
console.log('💡 確認事項:');
console.log('1. LINE Developers Console設定:');
console.log(
  `   - Webhook URL: ${DISCORD_WEBHOOK_URL || '(環境変数DISCORD_WEBHOOK_URLを設定してください)'}`,
);
console.log('   - Webhook の利用: 利用する');
console.log('   - 応答メッセージ: 無効');
console.log('');
console.log('2. グループ設定:');
console.log('   - Bot がグループメンバーになっている');
console.log('   - 「グループトーク・複数人トークへの参加を許可する」が有効');
console.log('');
console.log('3. テスト方法:');
console.log('   - グループで普通のメッセージを送信（Botに向けてでなく、普通の発言）');
console.log('   - Discord #urawa-ticket-notifications チャンネルを確認');
console.log('');
console.log('🚨 よくある問題:');
console.log('   - Webhook URL の入力ミス');
console.log('   - 設定保存忘れ');
console.log('   - ブラウザキャッシュの問題（ページ再読み込み）');
