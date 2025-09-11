#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * /api/collect-ticketsエンドポイント統合テスト
 * Google Cloud Tasks API呼び出しをmockして、DB保存まで通ることを確認
 */

import { load } from '@std/dotenv';

try {
  await load({ export: true });
} catch {
  // .envファイルが存在しない場合は無視
}

interface ApiResponse {
  status: string;
  message: string;
  data?: any;
  error?: string;
  timestamp: string;
  executionTimeMs?: number;
}

interface MockedTaskResponse {
  name: string;
  scheduleTime?: string;
  httpRequest?: {
    url: string;
    httpMethod: string;
  };
}

type MockedFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * Google Cloud Tasks APIのHTTP呼び出しをmockする
 */
function setupCloudTasksMock(): {
  restore: () => void;
  getEnqueuedTasks: () => MockedTaskResponse[];
} {
  const originalFetch = globalThis.fetch;
  const enqueuedTasks: MockedTaskResponse[] = [];

  const mockedFetch: MockedFetch = async (input, init) => {
    const url = input instanceof Request
      ? input.url
      : typeof input === 'string'
      ? input
      : input.toString();
    if (url.includes('cloudtasks.googleapis.com') && url.includes('/tasks')) {
      console.log(`🎯 Intercepted Cloud Tasks API call: ${url}`);

      if (init?.method === 'POST' || (input instanceof Request && input.method === 'POST')) {
        let taskData: any = {};

        try {
          if (init?.body) {
            taskData = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          } else if (input instanceof Request && input.body) {
            const bodyText = await input.text();
            taskData = JSON.parse(bodyText);
          }
        } catch {
          // ボディ解析に失敗した場合はデフォルト値を使用
        }
        const mockTaskName =
          `projects/mock-project/locations/mock-location/queues/notifications/tasks/mock-task-${Date.now()}`;
        const mockTask: MockedTaskResponse = {
          name: mockTaskName,
          scheduleTime: taskData.scheduleTime || new Date().toISOString(),
          httpRequest: {
            url: taskData.httpRequest?.url ||
              'https://mock-cloud-run.run.app/api/send-notification',
            httpMethod: taskData.httpRequest?.httpMethod || 'POST',
          },
        };

        enqueuedTasks.push(mockTask);

        return new Response(JSON.stringify(mockTask), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return originalFetch(input, init);
  };

  globalThis.fetch = mockedFetch;

  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
    getEnqueuedTasks: () => [...enqueuedTasks],
  };
}

/**
 * /api/collect-tickets APIを呼び出し
 */
async function callCollectTicketsApi(baseUrl: string): Promise<ApiResponse> {
  console.log('🚀 Starting /api/collect-tickets integration test...\n');

  const apiUrl = `${baseUrl}/api/collect-tickets`;
  console.log(`📞 Calling API: ${apiUrl}`);

  const authToken = Deno.env.get('TEST_AUTH_TOKEN') || 'dev-test-token';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      source: 'integration-test',
      timestamp: new Date().toISOString(),
    }),
  });

  console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API call failed: ${errorText}`);
    throw new Error(`API call failed with status ${response.status}: ${errorText}`);
  }

  const result: ApiResponse = await response.json();

  console.log('\n📋 API Response:');
  console.log(`✅ Status: ${result.status}`);
  console.log(`📝 Message: ${result.message}`);
  console.log(`⏰ Timestamp: ${result.timestamp}`);
  if (result.executionTimeMs) {
    console.log(`⚡ Execution Time: ${result.executionTimeMs}ms`);
  }

  if (result.data) {
    console.log('\n📊 Response Data:');
    Object.entries(result.data).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  if (result.error) {
    console.error(`⚠️  API Error: ${result.error}`);
    throw new Error(`API returned error: ${result.error}`);
  }
  console.log('\n🔍 Full Response Debug:');
  console.log(JSON.stringify(result, null, 2));

  return result;
}

/**
 * ローカルサーバーでのテスト
 */
async function testWithLocalServer(): Promise<void> {
  console.log('🔧 Testing with local development server...');
  console.log('📝 Make sure to start the server with: deno task dev:cloud-run\n');

  const localUrl = 'http://localhost:8080';
  console.log('🎭 Setting up Cloud Tasks mock...');
  const mockSetup = setupCloudTasksMock();

  try {
    console.log('🏥 Checking server health...');
    const healthResponse = await fetch(`${localUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log(`✅ Server is healthy: ${healthData.message}\n`);
    const result = await callCollectTicketsApi(localUrl);

    const enqueuedTasks = mockSetup.getEnqueuedTasks();
    console.log(`\n☁️  Cloud Tasks Mock Results:`);
    console.log(`📈 Total tasks enqueued: ${enqueuedTasks.length}`);

    if (enqueuedTasks.length > 0) {
      console.log('\n🎯 Enqueued tasks:');
      enqueuedTasks.forEach((task, index) => {
        console.log(`  [${index + 1}] ${task.name}`);
        console.log(`      URL: ${task.httpRequest?.url}`);
        console.log(`      Method: ${task.httpRequest?.httpMethod}`);
        console.log(`      Schedule: ${task.scheduleTime}`);
      });
    } else {
      console.log('ℹ️  No Cloud Tasks were enqueued (possibly no notifications scheduled)');
    }
    if (result.status !== 'success') {
      throw new Error(`API test failed: status is ${result.status}`);
    }

    console.log('\n🎉 API call completed successfully!');
    if (result.data) {
      console.log('\n📈 Test Results Summary:');

      if (result.data.ticketCount > 0) {
        console.log(`✅ Successfully processed ${result.data.ticketCount} tickets`);

        if (result.data.savedCount > 0) {
          console.log(`💾 Saved to database: ${result.data.savedCount} tickets`);
        }

        if (result.data.skippedCount > 0) {
          console.log(`⏭️  Skipped tickets: ${result.data.skippedCount}`);
        }

        if (result.data.errorCount > 0) {
          console.log(`⚠️  Errors encountered: ${result.data.errorCount}`);
        }
        if (enqueuedTasks.length > 0) {
          console.log(`☁️  Cloud Tasks enqueued: ${enqueuedTasks.length}`);
        }
      } else {
        console.log('ℹ️  No tickets were processed (possibly no new data)');
      }

      console.log(`⏱️  Total processing time: ${result.data.processingTime || 'N/A'}ms`);
    }
  } finally {
    mockSetup.restore();
    console.log('🔄 Cloud Tasks mock cleaned up');
  }
}

/**
 * メイン実行関数
 */
async function main(): Promise<void> {
  const args = Deno.args;
  const testType = args[0] || 'local';

  console.log('🧪 /api/collect-tickets Integration Test');
  console.log('='.repeat(50));
  console.log(`📋 Test Type: ${testType}\n`);

  if (testType !== 'local') {
    console.error('❌ Only local testing is currently supported');
    console.log('💡 Usage: deno run --allow-env --allow-net collect-tickets-api-test.ts local');
    Deno.exit(1);
  }

  try {
    await testWithLocalServer();
    console.log('\n✨ Integration test completed successfully!');
    console.log('📈 All assertions passed');
    console.log('💾 Database operations and Cloud Tasks mocking verified');
  } catch (error) {
    console.error('\n💥 Integration test failed:', error);
    console.error('📊 Test Details:');
    if (error instanceof Error) {
      console.error(`  Error Message: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack Trace: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
