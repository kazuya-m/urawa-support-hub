/**
 * アプリケーション設定管理
 * 環境変数から設定値を取得し、実行時に評価
 */

import { CloudTasksConfig } from '@/infrastructure/clients/CloudTasksClient.ts';
import { LineClientConfig } from '@/infrastructure/clients/LineClient.ts';

export interface AppConfig {
  cloudTasks: CloudTasksConfig;
  line: LineClientConfig;
}

/**
 * 環境変数から設定を取得
 * 実行時に毎回評価されるため、環境変数の変更が即座に反映
 */
export const getAppConfig = (): AppConfig => ({
  cloudTasks: {
    projectId: Deno.env.get('GOOGLE_CLOUD_PROJECT') || Deno.env.get('GCP_PROJECT_ID') || '',
    location: Deno.env.get('CLOUD_TASKS_LOCATION') || Deno.env.get('GCP_REGION') ||
      'asia-northeast1',
    queueName: 'notifications',
    enableDebugLogs: Deno.env.get('CLOUD_TASKS_DEBUG') === 'true',
    nodeEnv: Deno.env.get('NODE_ENV') || 'development',
  },
  line: {
    channelAccessToken: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '',
  },
});
