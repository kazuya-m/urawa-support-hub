#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

/**
 * シンプルなcollect-ticketsエンドポイントテスト
 * Dockerコンテナで実行中のAPIエンドポイントに直接リクエストを送信
 */

import { load } from '@std/dotenv';

// 環境変数を読み込み
try {
  await load({ export: true });
  console.log('📁 .env ファイルを読み込みました');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.log('⚠️  .env ファイルが見つからないか、読み込みに失敗しました:', message);
}

interface ApiResponse {
  status: string;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
  executionTimeMs?: number;
}

async function testCollectTickets(): Promise<void> {
  const baseUrl = 'http://localhost:8080';

  console.log('🧪 Collect Tickets Simple Test');
  console.log('='.repeat(50));
  console.log(`📡 Target: ${baseUrl}/api/collect-tickets\n`);

  try {
    // ヘルスチェック
    console.log('🏥 Health check...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    console.log('✅ Server is healthy\n');

    // collect-ticketsエンドポイントにリクエスト送信
    console.log('🎯 Sending request to /api/collect-tickets...');
    const startTime = Date.now();

    const response = await fetch(`${baseUrl}/api/collect-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'simple-test-script',
        timestamp: new Date().toISOString(),
      }),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`⏱️  Response Time: ${responseTime}ms\n`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const result: ApiResponse = await response.json();

    // レスポンス表示
    console.log('📋 API Response:');
    console.log(`✅ Status: ${result.status}`);
    console.log(`📝 Message: ${result.message}`);
    console.log(`⏰ Timestamp: ${result.timestamp}`);

    if (result.executionTimeMs) {
      console.log(`⚡ Server Execution Time: ${result.executionTimeMs}ms`);
    }

    if (result.data) {
      console.log('\n📈 Results Summary:');
      console.log(`🎫 Tickets processed: ${result.data.ticketCount || 0}`);
      console.log(`💾 Saved to database: ${result.data.savedCount || 0}`);
      console.log(`⏭️  Skipped: ${result.data.skippedCount || 0}`);
      console.log(`⚠️  Errors: ${result.data.errorCount || 0}`);

      if (result.data.processingTime) {
        console.log(`⏱️  Processing time: ${result.data.processingTime}ms`);
      }
    }

    if (result.status === 'success') {
      console.log('\n🎉 Test completed successfully!');
    } else {
      console.log('\n⚠️  Test completed with warnings');
    }
  } catch (error) {
    console.error('\n💥 Test failed:', error);

    if (error instanceof Error) {
      console.error(`📋 Error Message: ${error.message}`);

      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   • Make sure Docker container is running: deno task start');
        console.error('   • Check container status: deno task logs');
        console.error('   • Verify port 8080 is accessible');
      }
    }

    Deno.exit(1);
  }
}

if (import.meta.main) {
  await testCollectTickets();
}
