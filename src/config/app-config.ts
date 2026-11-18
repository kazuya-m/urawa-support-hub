/**
 * アプリケーション設定管理
 * 環境変数の読み取りをここに集める（ログの NODE_ENV・K_SERVICE、/health の確認、PORT は対象外）
 */

export interface CloudTasksConfig {
  projectId: string;
  location: string;
  queueName: string;
  enableDebugLogs: boolean;
  nodeEnv: string;
  /** エミュレーターの接続先（非 production のときだけ使う） */
  emulatorHost?: string;
  /** タスクの OIDC トークンに使うサービスアカウント */
  serviceAccountEmail?: string;
}

export interface LineClientConfig {
  channelAccessToken: string;
}

export interface SupabaseConfig {
  url?: string;
  serviceRoleKey?: string;
}

export interface AppConfig {
  nodeEnv?: string;
  cloudTasks: CloudTasksConfig;
  line: LineClientConfig;
  supabase: SupabaseConfig;
  /** Cloud Tasks から通知を送るときの呼び出し先（/api/send-notification の URL） */
  notificationUrl: string;
}

/**
 * 環境変数から設定を取得
 * 実行時に毎回評価されるため、環境変数の変更が即座に反映
 */
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
});
