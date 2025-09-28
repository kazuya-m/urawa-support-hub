#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

/**
 * スケジュール通知エンドポイントのローカルテスト用スクリプト
 *
 * 使用方法:
 * deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id> [notification-type]
 *
 * notification-type オプション:
 * - day_before: 前日通知
 * - hour_before: 1時間前通知
 * - minutes_before: 30分前通知
 * - all: 全ての通知タイプをテスト（デフォルト）
 */

import { load } from '@std/dotenv';
import { NOTIFICATION_TYPES, NotificationType } from '@/domain/config/NotificationConfig.ts';
import { NOTIFICATION_TYPE_STYLES } from '@/config/notification.ts';

await load({ export: true });

const ticketId = Deno.args[0];
const notificationTypeArg = Deno.args[1] || 'all';

if (!ticketId) {
  console.error(`
❌ チケットIDが必要です

使用方法:
  deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id> [notification-type]

例:
  # 全ての通知タイプをテスト
  deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts abc-123-def

  # 特定の通知タイプのみテスト
  deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts abc-123-def day_before

通知タイプ:
  - day_before: 前日通知
  - hour_before: 1時間前通知
  - minutes_before: 30分前通知
  - all: 全ての通知タイプ（デフォルト）

💡 テストデータ作成:
  deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create-notification-test
`);
  Deno.exit(1);
}

const BASE_URL = Deno.env.get('TEST_BASE_URL') || 'http://localhost:8080';
const NOTIFICATION_ENDPOINT = `${BASE_URL}/api/send-notification`;

async function checkServerHealth(): Promise<boolean> {
  try {
    console.log('🏥 サーバーのヘルスチェック中...');
    const response = await fetch(`${BASE_URL}/health`);
    const isHealthy = response.ok;

    console.log(`   ベースURL: ${BASE_URL}`);
    console.log(`   ステータス: ${response.status} ${response.statusText}`);
    console.log(`   結果: ${isHealthy ? '✅ 正常' : '❌ 異常'}\n`);

    return isHealthy;
  } catch (error) {
    console.error('❌ ヘルスチェックエラー:', error.message);
    console.log('\n💡 ローカルサーバー起動方法:');
    console.log('   deno task start\n');
    return false;
  }
}

async function testNotificationEndpoint(
  ticketId: string,
  notificationType: NotificationType,
): Promise<boolean> {
  const style = NOTIFICATION_TYPE_STYLES[notificationType];

  console.log(`\n📱 ${notificationType} 通知のテスト開始`);
  console.log(`   表示名: ${style.displayName}`);
  console.log(`   色: ${style.color}`);
  console.log(`   エンドポイント: ${NOTIFICATION_ENDPOINT}`);

  try {
    const requestBody = {
      ticketId,
      notificationType,
    };

    console.log('📤 リクエスト送信中...');
    console.log('   リクエストボディ:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`   レスポンスステータス: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log('   レスポンス:', JSON.stringify(result, null, 2));

      if (result.message) {
        console.log(`✅ ${notificationType} 通知送信成功: ${result.message}`);
        return true;
      } else {
        console.log(`⚠️ ${notificationType} 通知送信完了（詳細確認必要）`);
        return true;
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ ${notificationType} 通知送信失敗:`);
      console.error(`   ステータス: ${response.status}`);
      console.error(`   エラー詳細: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${notificationType} 通知エラー:`, error.message);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * メイン処理
 */
async function main() {
  console.log('🎯 スケジュール通知エンドポイントテスト開始');
  console.log(`📋 チケットID: ${ticketId}`);
  console.log(`🔧 通知タイプ: ${notificationTypeArg}`);
  console.log('='.repeat(60));

  // サーバーヘルスチェック
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.error('❌ サーバーが正常に稼働していません');
    Deno.exit(1);
  }

  // テスト対象の通知タイプを決定
  let notificationTypes: NotificationType[] = [];

  if (notificationTypeArg === 'all') {
    notificationTypes = [
      NOTIFICATION_TYPES.DAY_BEFORE,
      NOTIFICATION_TYPES.HOUR_BEFORE,
      NOTIFICATION_TYPES.MINUTES_BEFORE,
    ];
  } else {
    // 指定された通知タイプが有効かチェック
    const validTypes = Object.values(NOTIFICATION_TYPES);
    if (!validTypes.includes(notificationTypeArg as NotificationType)) {
      console.error(`\n❌ 無効な通知タイプ: ${notificationTypeArg}`);
      console.log('有効な通知タイプ:', validTypes.join(', '));
      Deno.exit(1);
    }
    notificationTypes = [notificationTypeArg as NotificationType];
  }

  // 通知テスト実行
  let successCount = 0;
  const totalTests = notificationTypes.length;

  for (let i = 0; i < notificationTypes.length; i++) {
    const type = notificationTypes[i];
    const success = await testNotificationEndpoint(ticketId, type);

    if (success) successCount++;

    // 最後のテスト以外は待機
    if (i < notificationTypes.length - 1) {
      console.log('⏳ 3秒待機中...');
      await delay(3000);
    }
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log(`   成功: ${successCount}/${totalTests}`);
  console.log(`   失敗: ${totalTests - successCount}/${totalTests}`);

  if (successCount === totalTests) {
    console.log('🎉 全てのテストが成功しました！');
  } else {
    console.log('⚠️ 一部のテストが失敗しました');
  }

  console.log('\n💡 チケット確認方法:');
  console.log('   LINE アプリで通知が届いているか確認してください');

  // 終了コード設定
  if (successCount < totalTests) {
    Deno.exit(1);
  }
}

// スクリプト実行
await main();
