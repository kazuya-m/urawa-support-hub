#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-run

/**
 * 通知機能統合テストワークフロー
 *
 * 使用方法:
 * deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts [mode]
 *
 * モード:
 * - full: 完全テスト（テストデータ作成 → 通知テスト → クリーンアップ）
 * - quick: クイックテスト（既存データでテスト実行のみ）
 * - cleanup-only: テストデータ削除のみ
 */

import { load } from '@std/dotenv';

await load({ export: true });

// コマンドライン引数の処理
const mode = Deno.args[0] || 'full';

if (!['full', 'quick', 'cleanup-only'].includes(mode)) {
  console.error(`
❌ 無効なモード: ${mode}

使用方法:
  deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts [mode]

モード:
  full         完全テスト（テストデータ作成 → 通知テスト → クリーンアップ）
  quick        クイックテスト（既存データでテスト実行のみ）
  cleanup-only テストデータ削除のみ

例:
  # 完全テスト実行
  deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts full

  # クイックテスト
  deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts quick
`);
  Deno.exit(1);
}

// 設定
const BASE_URL = Deno.env.get('TEST_BASE_URL') || 'http://localhost:8080';

/**
 * 外部スクリプトを実行
 */
async function runScript(
  scriptPath: string,
  args: string[] = [],
): Promise<{ success: boolean; output?: string }> {
  try {
    console.log(`🚀 実行中: ${scriptPath} ${args.join(' ')}`);

    const command = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-env',
        '--allow-net',
        '--allow-read',
        scriptPath,
        ...args,
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { code, stdout, stderr } = await command.output();

    // 出力を表示
    const stdoutText = new TextDecoder().decode(stdout);
    const stderrText = new TextDecoder().decode(stderr);

    if (stdoutText) {
      console.log(stdoutText);
    }

    if (stderrText) {
      console.error(stderrText);
    }

    if (code === 0) {
      console.log(`✅ ${scriptPath} 実行成功\n`);
      return { success: true, output: stdoutText };
    } else {
      console.error(`❌ ${scriptPath} 実行失敗 (終了コード: ${code})\n`);
      return { success: false, output: stderrText };
    }
  } catch (error) {
    console.error(`💥 ${scriptPath} 実行エラー:`, error.message);
    return { success: false };
  }
}

/**
 * 待機処理
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * サーバーのヘルスチェック
 */
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

/**
 * 出力からチケットIDを抽出
 */
function extractTicketIds(output: string): string[] {
  const ticketIds: string[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // "ID: ticket-id-here" 形式を検索
    const match = line.match(/ID:\s+([a-f0-9-]+)/);
    if (match) {
      ticketIds.push(match[1]);
    }
  }

  return ticketIds;
}

/**
 * 完全テストワークフロー
 */
async function runFullTest(): Promise<boolean> {
  console.log('🎯 通知機能完全テスト開始');
  console.log('='.repeat(60));

  let testTicketIds: string[] = [];
  let allSuccess = true;

  try {
    // 1. 既存テストデータのクリーンアップ
    console.log('📝 STEP 1: 既存テストデータのクリーンアップ');
    const cleanupResult = await runScript('scripts/data/setup-test-ticket.ts', ['cleanup-all']);
    if (!cleanupResult.success) {
      console.log('⚠️ クリーンアップに失敗しましたが、テストを続行します');
    }

    // 2. テストデータ作成
    console.log('📝 STEP 2: テストデータ作成');
    const createResult = await runScript('scripts/data/setup-test-ticket.ts', [
      'create-notification-test',
    ]);
    if (!createResult.success) {
      console.error('❌ テストデータ作成に失敗しました');
      return false;
    }

    // 作成されたチケットIDを抽出
    if (createResult.output) {
      testTicketIds = extractTicketIds(createResult.output);
      console.log(`📋 抽出されたチケットID: ${testTicketIds.join(', ')}`);
    }

    await delay(2000);

    // 3. サマリー通知テスト
    console.log('📝 STEP 3: サマリー通知テスト');
    const summaryResult = await runScript('scripts/demo/test-ticket-summary.ts', [BASE_URL]);
    if (!summaryResult.success) {
      console.error('❌ サマリー通知テストに失敗しました');
      allSuccess = false;
    }

    await delay(3000);

    // 4. スケジュール通知テスト（最初のチケットIDを使用）
    if (testTicketIds.length > 0) {
      console.log('📝 STEP 4: スケジュール通知テスト');

      // 全ての通知タイプをテスト
      const scheduleResult = await runScript(
        'scripts/demo/test-local-notification-endpoint.ts',
        [testTicketIds[0], 'all'],
      );

      if (!scheduleResult.success) {
        console.error('❌ スケジュール通知テストに失敗しました');
        allSuccess = false;
      }
    } else {
      console.log('⚠️ チケットIDが取得できなかったため、スケジュール通知テストをスキップします');
      allSuccess = false;
    }

    return allSuccess;
  } finally {
    // 5. クリーンアップ（オプション）
    if (Deno.env.get('KEEP_TEST_DATA') !== 'true') {
      console.log('📝 STEP 5: テストデータクリーンアップ');
      await runScript('scripts/data/setup-test-ticket.ts', ['cleanup-all']);
    } else {
      console.log('📝 STEP 5: テストデータを保持します（KEEP_TEST_DATA=true）');
    }
  }
}

/**
 * クイックテストワークフロー
 */
async function runQuickTest(): Promise<boolean> {
  console.log('⚡ 通知機能クイックテスト開始');
  console.log('='.repeat(60));

  let allSuccess = true;

  // 1. サマリー通知テスト
  console.log('📝 STEP 1: サマリー通知テスト');
  const summaryResult = await runScript('scripts/demo/test-ticket-summary.ts', [BASE_URL]);
  if (!summaryResult.success) {
    console.error('❌ サマリー通知テストに失敗しました');
    allSuccess = false;
  }

  return allSuccess;
}

/**
 * クリーンアップのみ
 */
async function runCleanupOnly(): Promise<boolean> {
  console.log('🗑️ テストデータクリーンアップのみ実行');
  console.log('='.repeat(60));

  const cleanupResult = await runScript('scripts/data/setup-test-ticket.ts', ['cleanup-all']);
  return cleanupResult.success;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🎯 通知機能統合テスト');
  console.log(`🔧 実行モード: ${mode}`);
  console.log(`🌐 ベースURL: ${BASE_URL}`);

  // ヘルプ表示
  if (Deno.args.includes('--help') || Deno.args.includes('-h')) {
    console.log(`
通知機能統合テストワークフロー

モード説明:
  full         完全テスト
               1. 既存テストデータクリーンアップ
               2. 新しいテストデータ作成
               3. サマリー通知テスト
               4. スケジュール通知テスト
               5. テストデータクリーンアップ

  quick        クイックテスト
               - サマリー通知テストのみ実行
               - 既存データを使用

  cleanup-only クリーンアップのみ
               - テストデータを削除

環境変数:
  TEST_BASE_URL      テスト対象のベースURL
  KEEP_TEST_DATA     'true' の場合、テストデータを削除しない（fullモードのみ）

例:
  # ローカル環境で完全テスト
  deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts full

  # 本番環境でクイックテスト
  TEST_BASE_URL=https://your-cloud-run-url deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts quick
`);
    return;
  }

  // サーバーヘルスチェック（cleanup-onlyモード以外）
  if (mode !== 'cleanup-only') {
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      console.error('❌ サーバーが正常に稼働していません。テストを中止します。');
      Deno.exit(1);
    }
  }

  // モード別実行
  let success = false;
  const startTime = Date.now();

  switch (mode) {
    case 'full':
      success = await runFullTest();
      break;
    case 'quick':
      success = await runQuickTest();
      break;
    case 'cleanup-only':
      success = await runCleanupOnly();
      break;
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log(`   モード: ${mode}`);
  console.log(`   結果: ${success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`   実行時間: ${duration}ms`);

  if (success) {
    console.log('🎉 テストが正常に完了しました！');

    if (mode !== 'cleanup-only') {
      console.log('\n💡 確認事項:');
      console.log('   1. LINE アプリで通知が届いているか確認してください');
      console.log('   2. 通知内容が正しく表示されているか確認してください');
    }
  } else {
    console.log('❌ テストが失敗しました');
    console.log('\n🔍 トラブルシューティング:');
    console.log('   1. サーバーが正常に起動しているか確認');
    console.log('   2. 環境変数が正しく設定されているか確認');
    console.log('   3. データベース接続が正常か確認');
    console.log('   4. LINE Bot の設定が正しいか確認');
  }

  // 終了コード設定
  if (!success) {
    Deno.exit(1);
  }
}

// スクリプト実行
await main();
