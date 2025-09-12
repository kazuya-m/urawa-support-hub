#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write --allow-sys --allow-run

/**
 * フル統合テスト実行スクリプト
 * サーバーを適切な権限で起動してからテストを実行
 */

import { load } from '@std/dotenv';

// .envファイルを読み込み
try {
  await load({ export: true });
} catch {
  // .envファイルが存在しない場合は無視
}

async function runFullIntegrationTest(): Promise<void> {
  console.log('🚀 Full Integration Test Runner');
  console.log('='.repeat(50));

  let serverProcess: Deno.ChildProcess | null = null;

  try {
    // 1. サーバーを適切な権限で起動
    console.log('🔧 Starting server with proper permissions...');

    const serverCommand = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-env',
        '--allow-net',
        '--allow-read',
        '--allow-write',
        '--allow-sys',
        '--allow-run',
        'src/cloud-run/urawa-support-hub/main.ts',
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    serverProcess = serverCommand.spawn();

    // サーバーの起動を少し待つ
    console.log('⏳ Waiting for server to start...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 2. ヘルスチェック
    console.log('🏥 Checking server health...');
    let healthCheckRetries = 5;
    let serverReady = false;

    while (healthCheckRetries > 0 && !serverReady) {
      try {
        const healthResponse = await fetch('http://localhost:8080/health', {
          signal: AbortSignal.timeout(5000),
        });

        if (healthResponse.ok) {
          console.log('✅ Server is ready');
          serverReady = true;
        } else {
          throw new Error(`Health check failed: ${healthResponse.status}`);
        }
      } catch (error) {
        healthCheckRetries--;
        console.log(`⏳ Server not ready yet, retrying... (${healthCheckRetries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!serverReady) {
      throw new Error('Server failed to start properly');
    }

    // 3. 統合テストを実行
    console.log('\n🧪 Running integration test...');

    const testCommand = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-env',
        '--allow-net',
        '--allow-read',
        'tests/integration/collect-tickets-api-test.ts',
      ],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const testResult = await testCommand.output();

    if (!testResult.success) {
      throw new Error('Integration test failed');
    }

    // 4. データベース確認
    console.log('\n🔍 Checking database results...');

    const dbCheckCommand = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-env',
        '--allow-net',
        '--allow-read',
        'scripts/debug/check-tickets-db.ts',
      ],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    await dbCheckCommand.output();

    console.log('\n✨ Full integration test completed successfully!');
  } catch (error) {
    console.error('\n💥 Full integration test failed:', error);
    if (error instanceof Error) {
      console.error(`  Message: ${error.message}`);
    }
    Deno.exit(1);
  } finally {
    // サーバープロセスを終了
    if (serverProcess) {
      console.log('\n🛑 Stopping server...');
      try {
        serverProcess.kill('SIGTERM');
        await serverProcess.status;
        console.log('✅ Server stopped');
      } catch (error) {
        console.error('⚠️  Error stopping server:', error);
        try {
          serverProcess.kill('SIGKILL');
        } catch {
          // Ignore
        }
      }
    }
  }
}

if (import.meta.main) {
  runFullIntegrationTest();
}
