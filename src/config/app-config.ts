export interface CloudTasksConfig {
  projectId: string;
  location: string;
  queueName: string;
  enableDebugLogs: boolean;
  nodeEnv: string;
  emulatorHost?: string;
  serviceAccountEmail?: string;
}

export interface LineClientConfig {
  channelAccessToken: string;
}

export interface SupabaseConfig {
  url?: string;
  serviceRoleKey?: string;
}

export interface CloudRunJobConfig {
  executionId?: string;
  taskAttempt?: string;
}

export interface AppConfig {
  nodeEnv?: string;
  cloudTasks: CloudTasksConfig;
  line: LineClientConfig;
  supabase: SupabaseConfig;
  notificationUrl: string;
  cloudRunJob: CloudRunJobConfig;
}

export const getAppConfig = (): AppConfig => ({
  nodeEnv: Deno.env.get('NODE_ENV'),
  cloudTasks: {
    projectId: Deno.env.get('GC_PROJECT_ID') || '',
    location: Deno.env.get('CLOUD_TASKS_LOCATION') || Deno.env.get('GCP_REGION') ||
      'asia-northeast1',
    queueName: 'notifications',
    enableDebugLogs: Deno.env.get('CLOUD_TASKS_DEBUG') === 'true',
    nodeEnv: Deno.env.get('NODE_ENV') || 'development',
    emulatorHost: Deno.env.get('CLOUD_TASKS_EMULATOR_HOST'),
    serviceAccountEmail: Deno.env.get('CLOUD_TASKS_SERVICE_ACCOUNT'),
  },
  line: {
    channelAccessToken: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '',
  },
  supabase: {
    url: Deno.env.get('SUPABASE_URL'),
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  },
  notificationUrl: Deno.env.get('CLOUD_RUN_NOTIFICATION_URL') || '',
  cloudRunJob: {
    executionId: Deno.env.get('CLOUD_RUN_EXECUTION'),
    taskAttempt: Deno.env.get('CLOUD_RUN_TASK_ATTEMPT'),
  },
});
