import { assertEquals } from 'std/assert/mod.ts';
import { getAppConfig } from '../app-config.ts';

const ENV_KEYS = [
  'NODE_ENV',
  'GC_PROJECT_ID',
  'CLOUD_TASKS_LOCATION',
  'GCP_REGION',
  'CLOUD_TASKS_DEBUG',
  'CLOUD_TASKS_EMULATOR_HOST',
  'CLOUD_TASKS_SERVICE_ACCOUNT',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUD_RUN_NOTIFICATION_URL',
  'CLOUD_RUN_EXECUTION',
  'CLOUD_RUN_TASK_ATTEMPT',
];

function withEnv(values: Record<string, string>, fn: () => void): void {
  const original = ENV_KEYS.map((key) => [key, Deno.env.get(key)] as const);
  for (const key of ENV_KEYS) Deno.env.delete(key);
  for (const [key, value] of Object.entries(values)) Deno.env.set(key, value);
  try {
    fn();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test('getAppConfig', async (t) => {
  await t.step('環境変数がなければ既定値', () => {
    withEnv({}, () => {
      assertEquals(getAppConfig(), {
        nodeEnv: undefined,
        cloudTasks: {
          projectId: '',
          location: 'asia-northeast1',
          queueName: 'notifications',
          enableDebugLogs: false,
          nodeEnv: 'development',
          emulatorHost: undefined,
          serviceAccountEmail: undefined,
        },
        line: { channelAccessToken: '' },
        supabase: { url: undefined, serviceRoleKey: undefined },
        notificationUrl: '',
        cloudRunJob: { executionId: undefined, taskAttempt: undefined },
      });
    });
  });

  await t.step('環境変数の値を読む', () => {
    withEnv({
      NODE_ENV: 'production',
      GC_PROJECT_ID: 'project-1',
      CLOUD_TASKS_LOCATION: 'us-central1',
      GCP_REGION: 'europe-west1',
      CLOUD_TASKS_DEBUG: 'true',
      CLOUD_TASKS_EMULATOR_HOST: 'localhost:8123',
      CLOUD_TASKS_SERVICE_ACCOUNT: 'tasks@example.iam.gserviceaccount.com',
      LINE_CHANNEL_ACCESS_TOKEN: 'line-token',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      CLOUD_RUN_NOTIFICATION_URL: 'https://example.run.app/api/send-notification',
      CLOUD_RUN_EXECUTION: 'collect-tickets-abc12',
      CLOUD_RUN_TASK_ATTEMPT: '1',
    }, () => {
      assertEquals(getAppConfig(), {
        nodeEnv: 'production',
        cloudTasks: {
          projectId: 'project-1',
          location: 'us-central1',
          queueName: 'notifications',
          enableDebugLogs: true,
          nodeEnv: 'production',
          emulatorHost: 'localhost:8123',
          serviceAccountEmail: 'tasks@example.iam.gserviceaccount.com',
        },
        line: { channelAccessToken: 'line-token' },
        supabase: { url: 'https://example.supabase.co', serviceRoleKey: 'service-key' },
        notificationUrl: 'https://example.run.app/api/send-notification',
        cloudRunJob: { executionId: 'collect-tickets-abc12', taskAttempt: '1' },
      });
    });
  });

  await t.step('CLOUD_TASKS_LOCATION がなければ GCP_REGION を使う', () => {
    withEnv({ GCP_REGION: 'europe-west1' }, () => {
      assertEquals(getAppConfig().cloudTasks.location, 'europe-west1');
    });
  });
});
