#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-run

import { load } from '@std/dotenv';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';

// Load environment variables
await load({ export: true });

const taskId = Deno.args[0];

if (!taskId) {
  console.error('❌ Task ID is required');
  console.log(
    'Usage: deno run --allow-env --allow-net --allow-read --allow-run scripts/dequeue-test-task.ts <task-id>',
  );
  Deno.exit(1);
}

async function dequeueTask() {
  console.log(`🗑️ Dequeuing task: ${taskId}`);

  try {
    const config = {
      projectId: Deno.env.get('GOOGLE_CLOUD_PROJECT') || Deno.env.get('GCP_PROJECT_ID') || '',
      location: Deno.env.get('CLOUD_TASKS_LOCATION') || 'asia-northeast1',
      queueName: 'notifications',
      enableDebugLogs: true,
      denoEnv: Deno.env.get('DENO_ENV') || 'development',
    };
    const client = new CloudTasksClient(config);
    await client.dequeueTask(taskId);
    console.log('✅ Task dequeued successfully');
  } catch (error) {
    console.error('❌ Failed to dequeue task:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await dequeueTask();
}
