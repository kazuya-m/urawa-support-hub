#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read
/**
 * LINE通知フォーマットテストスクリプト
 * 3つの通知タイプ（🟢 day_before, 🟡 hour_before, 🔴 minutes_before）をテスト送信
 * Usage: deno run --allow-env --allow-net --allow-read scripts/test-line-broadcast.ts
 */

import { load } from 'std/dotenv/mod.ts';
import { LINE_MESSAGE_TEMPLATES, NOTIFICATION_TYPE_STYLES } from '@/config/notification.ts';
import { URAWA_URL_CONFIG } from '@/config/url.ts';
import { NOTIFICATION_TYPES, NotificationType } from '@/domain/entities/NotificationTypes.ts';
import { formatJST } from '@/shared/utils/datetime.ts';

// .envファイルの読み込み
try {
  await load({
    export: true,
    examplePath: null,
    allowEmptyValues: true,
  });
} catch {
  // .envファイル読み込みエラーは無視
}

// 必要な環境変数のチェック
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error('❌ エラー: LINE_CHANNEL_ACCESS_TOKEN が設定されていません');
  console.error('   .env ファイルで LINE_CHANNEL_ACCESS_TOKEN を設定してください');
  Deno.exit(1);
}

console.log('🎫 LINE通知フォーマットテスト - 3つの通知タイプを順次送信...');
console.log();

// テスト用チケットデータ
const testTicket = {
  matchName: '浦和レッズ vs FC東京',
  matchDate: new Date('2024-03-15T19:00:00+09:00'),
  venue: '味の素スタジアム',
  saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
  ticketUrl: 'https://www.jleague-ticket.jp/',
};

// API エンドポイント
const BROADCAST_API = URAWA_URL_CONFIG.staticUrls.lineApiBroadcast;

/**
 * 指定した通知タイプでLINE通知を送信
 */
async function sendNotificationTest(notificationType: NotificationType) {
  const style = NOTIFICATION_TYPE_STYLES[notificationType];

  console.log(`📱 ${notificationType} 通知送信中...`);
  console.log(`   色: ${style.color}`);
  console.log(`   タイトル: ${style.title}`);
  console.log(`   緊急度: ${style.urgency}`);

  // LINE Flex Messageを生成
  const lineMessage = LINE_MESSAGE_TEMPLATES.ticketNotification(
    testTicket.matchName,
    formatJST(testTicket.matchDate, 'M/d(eeeee) HH:mm'),
    testTicket.venue,
    testTicket.saleStartDate ? formatJST(testTicket.saleStartDate, 'M/d(eeeee) HH:mm') : '未定',
    notificationType,
    testTicket.ticketUrl,
  );

  try {
    const response = await fetch(BROADCAST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [lineMessage],
      }),
    });

    const responseText = await response.text();

    if (response.ok && (responseText === '{}' || responseText.includes('sentMessages'))) {
      console.log(`✅ ${notificationType} 送信成功！`);
    } else {
      console.error(`❌ ${notificationType} 送信失敗:`, responseText);
      return false;
    }
  } catch (error) {
    console.error(
      `❌ ${notificationType} エラー:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }

  return true;
}

/**
 * 遅延処理
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * メイン実行
 */
async function main() {
  const notificationTypes: NotificationType[] = [
    NOTIFICATION_TYPES.DAY_BEFORE,
    NOTIFICATION_TYPES.HOUR_BEFORE,
    NOTIFICATION_TYPES.MINUTES_BEFORE,
  ];

  let successCount = 0;

  for (let i = 0; i < notificationTypes.length; i++) {
    const type = notificationTypes[i];

    const success = await sendNotificationTest(type);
    if (success) {
      successCount++;
    }

    // 最後の通知でなければ待機
    if (i < notificationTypes.length - 1) {
      console.log('   ⏳ 3秒待機中...');
      console.log();
      await delay(3000);
    }
  }

  console.log();
  console.log('🎉 テスト送信完了！');
  console.log(`📊 結果: ${successCount}/${notificationTypes.length} 件成功`);
  console.log();
  console.log('📱 LINEアプリで以下の順序で通知を確認してください:');
  console.log('   1. 🟢 緑色: 「明日発売開始」');
  console.log('   2. 🟡 黄色: 「1時間後に発売開始」');
  console.log('   3. 🔴 赤色: 「まもなく発売開始」');
  console.log();
  console.log('🎨 各通知の色の違いと動的メッセージ（対戦カード情報）をご確認ください！');

  if (successCount < notificationTypes.length) {
    Deno.exit(1);
  }
}

// スクリプト実行
if (import.meta.main) {
  await main();
}
