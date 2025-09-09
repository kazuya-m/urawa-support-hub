#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read=.env
/**
 * Cloud Tasks enqueue機能をテストするスクリプト
 * Issue #25: Google Cloud Tasks通知スケジューリング実装
 */

import { load } from 'https://deno.land/std@0.208.0/dotenv/mod.ts';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';
import {
  NOTIFICATION_TIMING_CONFIG,
  NOTIFICATION_TYPES,
} from '@/domain/entities/NotificationTypes.ts';

// .envファイルを読み込み
await load({ export: true });

/**
 * 通知タイプ選択機能
 */
function selectNotificationType(): string {
  const args = Deno.args;

  // コマンドライン引数で指定された場合
  if (args.length > 0) {
    const specifiedType = args[0];
    if (Object.values(NOTIFICATION_TYPES).includes(specifiedType as any)) {
      return specifiedType;
    } else {
      console.error(`❌ Invalid notification type: ${specifiedType}`);
      console.log('   Valid types:', Object.values(NOTIFICATION_TYPES).join(', '));
      Deno.exit(1);
    }
  }

  // デフォルトは day_before
  return NOTIFICATION_TYPES.DAY_BEFORE;
}

async function testCloudTasksEnqueue() {
  console.log('🚀 Testing Cloud Tasks enqueue functionality with notification types...');

  // 通知タイプの選択
  const selectedNotificationType = selectNotificationType();
  const notificationConfig =
    NOTIFICATION_TIMING_CONFIG[selectedNotificationType as keyof typeof NOTIFICATION_TIMING_CONFIG];

  console.log(`📋 Selected notification type: ${selectedNotificationType}`);
  console.log(`   Display name: ${notificationConfig.displayName}`);
  console.log(`   Description: ${notificationConfig.description}`);
  console.log();

  // 環境変数の確認と設定
  const gcpProjectId = Deno.env.get('GCP_PROJECT_ID');
  const gcpRegion = Deno.env.get('GCP_REGION') || 'asia-northeast1';
  const cloudRunUrl = Deno.env.get('CLOUD_RUN_NOTIFICATION_URL') ||
    `https://${
      Deno.env.get('CLOUD_RUN_SERVICE_NAME')
    }-hash-${gcpRegion}.a.run.app/api/send-notification`;

  console.log('📋 Checking environment variables...');

  if (!gcpProjectId) {
    console.error(
      `❌ Missing required environment variable: GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT`,
    );
    Deno.exit(1);
  }
  console.log(`✅ GCP Project ID: ${gcpProjectId}`);

  // 環境変数を設定（CloudTasksClient用）
  if (!Deno.env.get('GCP_PROJECT_ID')) {
    Deno.env.set('GCP_PROJECT_ID', gcpProjectId);
  }
  if (!Deno.env.get('CLOUD_TASKS_LOCATION')) {
    Deno.env.set('CLOUD_TASKS_LOCATION', gcpRegion);
  }

  console.log(`✅ CLOUD_TASKS_LOCATION: ${gcpRegion}`);
  console.log(`✅ Target URL: ${cloudRunUrl}`);

  // Service Account確認
  const serviceAccount = Deno.env.get('CLOUD_TASKS_SERVICE_ACCOUNT');
  if (serviceAccount) {
    console.log(`✅ CLOUD_TASKS_SERVICE_ACCOUNT: ${serviceAccount}`);
  } else {
    console.log(`⚠️  CLOUD_TASKS_SERVICE_ACCOUNT not set (using default service account)`);
  }
  console.log();

  try {
    // CloudTasksClientのインスタンスを作成
    console.log('🔧 Initializing Cloud Tasks client...');
    const config = {
      projectId: gcpProjectId,
      location: gcpRegion,
      queueName: 'notifications',
      enableDebugLogs: true,
      denoEnv: Deno.env.get('DENO_ENV') || 'development',
    };
    const client = new CloudTasksClient(config);
    console.log('✅ Cloud Tasks client initialized successfully');
    console.log();

    // テストタスクのパラメータを設定
    const testTaskId = `test-task-${selectedNotificationType}-${Date.now()}`;
    const scheduledTime = new Date(Date.now() + 30 * 1000); // 30秒後
    const testPayload = {
      ticketId: 'test-ticket-123',
      notificationType: selectedNotificationType,
      testData: true,
      timestamp: new Date().toISOString(),
      notificationStyle: notificationConfig.displayName,
    };

    console.log('📝 Test task parameters:');
    console.log(`   Task ID: ${testTaskId}`);
    console.log(`   Scheduled time: ${scheduledTime.toISOString()}`);
    console.log(`   Target URL: ${cloudRunUrl}`);
    console.log(`   Payload:`, JSON.stringify(testPayload, null, 2));
    console.log();

    // タスクをenqueue
    console.log('📤 Enqueuing test task...');
    const createdTaskId = await client.enqueueTask({
      taskId: testTaskId,
      payload: testPayload,
      scheduledTime: scheduledTime,
      targetUrl: cloudRunUrl,
      headers: {
        'X-Test-Task': 'true',
      },
    });

    console.log(`✅ Task enqueued successfully!`);
    console.log(`   Created Task ID: ${createdTaskId}`);
    console.log();

    // タスクの詳細情報を取得
    console.log('🔍 Retrieving task details...');
    const taskDetails = await client.getTask(createdTaskId);

    if (taskDetails) {
      console.log('✅ Task details retrieved:');
      console.log(`   Name: ${taskDetails.name}`);
      console.log(`   Schedule time: ${taskDetails.scheduleTime.toISOString()}`);
      console.log(`   HTTP method: ${taskDetails.httpRequest.httpMethod}`);
      console.log(`   Target URL: ${taskDetails.httpRequest.url}`);
      console.log(`   Payload:`, taskDetails.payload);
    } else {
      console.log(
        '⚠️  Could not retrieve task details (this might be normal depending on queue configuration)',
      );
    }
    console.log();

    // キュー内のタスク一覧を取得
    console.log('📋 Listing tasks in queue...');
    const tasks = await client.listTasks();
    console.log(`✅ Found ${tasks.length} task(s) in queue`);

    if (tasks.length > 0) {
      console.log('   Current tasks:');
      tasks.forEach((task, index) => {
        const taskId = task.name.split('/').pop() || 'unknown';
        console.log(
          `   ${index + 1}. Task ID: ${taskId}, Scheduled: ${task.scheduleTime.toISOString()}`,
        );
      });
    }
    console.log();

    console.log('🎉 Cloud Tasks enqueue test completed successfully!');
    console.log();
    console.log('📝 Next steps:');
    console.log(`   1. Check Google Cloud Console for the task in the 'notifications' queue`);
    console.log(`   2. Wait for ${scheduledTime.toISOString()} to see if the task executes`);
    console.log(`   3. Monitor Cloud Run logs for incoming HTTP requests`);
    console.log(
      `   4. Check LINE/Discord for notification with ${selectedNotificationType} styling`,
    );
    console.log(`   5. You can cancel the test task using:`);
    console.log(
      `      deno run --allow-env --allow-net scripts/cancel-test-task.ts ${createdTaskId}`,
    );
    console.log();
    console.log('🔄 Testing other notification types:');
    console.log(
      `   deno run --allow-env --allow-net scripts/test-cloud-tasks-enqueue.ts day_before`,
    );
    console.log(
      `   deno run --allow-env --allow-net scripts/test-cloud-tasks-enqueue.ts hour_before`,
    );
    console.log(
      `   deno run --allow-env --allow-net scripts/test-cloud-tasks-enqueue.ts minutes_before`,
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error();
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    Deno.exit(1);
  }
}

// スクリプトとして実行された場合のみテストを実行
if (import.meta.main) {
  await testCloudTasksEnqueue();
}
