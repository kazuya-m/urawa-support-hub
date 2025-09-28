#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * チケット一覧送信機能のローカルテスト用スクリプト
 *
 * 使用方法:
 * deno run --allow-net --allow-env --allow-read demo/test-ticket-summary.ts
 */

import { load } from '@std/dotenv';

// 環境変数を読み込み
try {
  await load({ export: true });
  console.log('📁 .env ファイルを読み込みました');
} catch (error) {
  console.log(
    '⚠️  .env ファイルが見つからないか、読み込みに失敗しました:',
    error instanceof Error ? error.message : String(error),
  );
}

const DEFAULT_URL = 'http://localhost:8080';

async function testTicketSummaryEndpoint(baseUrl: string = DEFAULT_URL) {
  const url = `${baseUrl}/api/ticket-summary`;

  console.log('🎫 チケット一覧送信機能のテスト開始');
  console.log(`📡 エンドポイント: ${url}`);

  // 環境変数の確認
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const lineToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

  console.log('🔧 環境変数チェック:');
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`   LINE_CHANNEL_ACCESS_TOKEN: ${lineToken ? '✅ 設定済み' : '❌ 未設定'}`);

  console.log('='.repeat(50));

  try {
    console.log('📤 POST リクエスト送信中...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 ステータスコード: ${response.status}`);
    console.log(`📊 ステータステキスト: ${response.statusText}`);

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ リクエスト成功');

      try {
        const jsonData = JSON.parse(responseText);
        console.log('📋 レスポンス内容:');
        console.log(JSON.stringify(jsonData, null, 2));
      } catch {
        console.log('📋 レスポンス内容 (テキスト):');
        console.log(responseText);
      }
    } else {
      console.log('❌ リクエスト失敗');
      console.log('📋 エラー内容:');
      console.log(responseText);
    }
  } catch (error) {
    console.error('💥 リクエスト送信エラー:');
    console.error(error);
  }

  console.log('='.repeat(50));
  console.log('🏁 テスト完了');
}

// コマンドライン引数から URL を取得（指定されていない場合はデフォルト）
const args = Deno.args;
const customUrl = args.length > 0 ? args[0] : DEFAULT_URL;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
チケット一覧送信機能テストスクリプト

使用方法:
  deno run --allow-net --allow-env --allow-read demo/test-ticket-summary.ts [URL]

引数:
  URL    テスト対象のベースURL (デフォルト: ${DEFAULT_URL})

例:
  deno run --allow-net --allow-env --allow-read demo/test-ticket-summary.ts
  deno run --allow-net --allow-env --allow-read demo/test-ticket-summary.ts http://localhost:3000
  deno run --allow-net --allow-env --allow-read demo/test-ticket-summary.ts https://your-cloud-run-url

環境変数:
  SUPABASE_URL              Supabaseプロジェクトの URL
  LINE_CHANNEL_ACCESS_TOKEN LINE Messaging API のアクセストークン

オプション:
  -h, --help    このヘルプを表示
`);
  Deno.exit(0);
}

// テスト実行
await testTicketSummaryEndpoint(customUrl);
