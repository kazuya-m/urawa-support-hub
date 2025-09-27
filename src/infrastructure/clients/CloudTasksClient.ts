import { CloudTasksClient as GoogleCloudTasksClient } from '@google-cloud/tasks';
import {
  EnqueueTaskParams,
  ICloudTasksClient,
  Task,
} from '@/application/interfaces/clients/ICloudTasksClient.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

// Re-export types for test files
export type { EnqueueTaskParams, Task };

export interface CloudTasksConfig {
  projectId: string;
  location: string;
  queueName: string;
  enableDebugLogs: boolean;
  nodeEnv: string;
}

/**
 * Google Cloud Tasks クライアント
 * Google Cloud Tasks APIを使用してタスクの管理を行う
 * gRPC接続問題を回避するためREST fallbackを使用
 */
export class CloudTasksClient implements ICloudTasksClient {
  private client: GoogleCloudTasksClient;
  private readonly config: CloudTasksConfig;

  constructor(config: CloudTasksConfig) {
    this.config = config;

    if (!this.config.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable is required');
    }

    // 一時的に本番環境でもRESTを使用してgRPC問題を切り分け
    const clientOptions = { fallback: 'rest' as const };

    this.client = new GoogleCloudTasksClient(clientOptions);

    // 認証情報のテスト（本番環境でのみ）
    if (this.config.nodeEnv === 'production') {
      this.validateAuthentication();
    }

    if (this.config.enableDebugLogs) {
      CloudLogger.debug('CloudTasks client initialized', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'initialization',
        },
        metadata: {
          queueName: this.config.queueName,
        },
      });
    }
  }

  async enqueueTask(params: EnqueueTaskParams): Promise<string> {
    const {
      taskId,
      payload,
      scheduledTime,
      targetUrl,
      httpMethod = 'POST',
      headers = {},
    } = params;

    // スケジュール時刻の検証
    if (scheduledTime <= new Date()) {
      throw new Error(`Scheduled time must be in the future: ${scheduledTime.toISOString()}`);
    }

    // タスクIDを生成（指定がなければUUIDを使用）
    const actualTaskId = taskId || crypto.randomUUID();

    const queuePath = this.client.queuePath(
      this.config.projectId,
      this.config.location,
      this.config.queueName,
    );

    const task = {
      name: `${queuePath}/tasks/${actualTaskId}`,
      scheduleTime: {
        seconds: Math.floor(scheduledTime.getTime() / 1000),
      },
      httpRequest: {
        url: targetUrl,
        httpMethod: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: btoa(JSON.stringify(payload)),
        oidcToken: {
          serviceAccountEmail: Deno.env.get('CLOUD_TASKS_SERVICE_ACCOUNT'),
          audience: new URL(targetUrl).origin,
        },
      },
    };

    try {
      const [response] = await this.client.createTask({
        parent: queuePath,
        task,
      });

      if (!response.name) {
        throw new Error('Failed to create task: no task name returned');
      }

      const createdTaskId = response.name.split('/').pop()!;

      CloudLogger.info('Task created successfully', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId: createdTaskId,
          processingStage: 'enqueue_success',
        },
        metadata: {
          targetUrl,
          queueName: this.config.queueName,
        },
      });

      return createdTaskId;
    } catch (error) {
      // エラーの詳細情報を構造化ログで出力
      const errorDetails: Record<string, unknown> = {};
      const errorMessage = getErrorMessage(error);
      let errorCode: string = ErrorCodes.CLOUD_TASKS_ERROR;

      if (error instanceof Error) {
        // Google Cloud エラーの場合、ステータスコードとコードを抽出
        if ('code' in error) {
          errorDetails.grpcCode = error.code;
          // 403 Forbiddenの場合
          if (error.code === 7 || errorMessage.includes('403')) {
            errorCode = ErrorCodes.PERMISSION_DENIED;
          }
        }
        if ('details' in error) {
          errorDetails.details = error.details;
        }
      }

      CloudLogger.error('Failed to enqueue task', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId: actualTaskId,
          processingStage: 'enqueue_error',
        },
        metadata: {
          targetUrl,
          queueName: this.config.queueName,
        },
        error: {
          ...toErrorInfo(error, errorCode, errorCode !== ErrorCodes.PERMISSION_DENIED),
          ...errorDetails,
        },
      });

      throw new Error(
        `Failed to enqueue task: ${errorMessage}`,
      );
    }
  }

  async dequeueTask(taskId: string): Promise<void> {
    const taskName = this.client.taskPath(
      this.config.projectId,
      this.config.location,
      this.config.queueName,
      taskId,
    );

    if (this.config.enableDebugLogs) {
      CloudLogger.debug('Dequeuing task', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId,
          processingStage: 'dequeue_start',
        },
        metadata: {
          queueName: this.config.queueName,
        },
      });
    }

    try {
      await this.client.deleteTask({ name: taskName });
    } catch (error) {
      CloudLogger.error('Failed to dequeue task', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId,
          processingStage: 'dequeue_error',
        },
        metadata: {
          queueName: this.config.queueName,
        },
        error: toErrorInfo(error, ErrorCodes.CLOUD_TASKS_ERROR, true),
      });

      throw new Error(
        `Failed to dequeue task: ${getErrorMessage(error)}`,
      );
    }
  }

  async listTasks(queueName?: string): Promise<Task[]> {
    const queue = queueName || this.config.queueName;
    const queuePath = this.client.queuePath(this.config.projectId, this.config.location, queue);

    if (this.config.enableDebugLogs) {
      CloudLogger.debug('Listing tasks in queue', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          queueName: queue,
          processingStage: 'list_start',
        },
      });
    }

    try {
      const [tasks] = await this.client.listTasks({ parent: queuePath });

      return tasks.map((task) => {
        return {
          name: task.name || '',
          scheduleTime: task.scheduleTime
            ? new Date(Number(task.scheduleTime.seconds) * 1000)
            : new Date(),
          payload: task.httpRequest?.body
            ? JSON.parse(atob(task.httpRequest.body as string))
            : null,
          httpRequest: {
            url: task.httpRequest?.url || '',
            httpMethod: String(task.httpRequest?.httpMethod || 'POST'),
          },
        };
      });
    } catch (error) {
      CloudLogger.error('Failed to list tasks', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          queueName: queue,
          processingStage: 'list_error',
        },
        error: toErrorInfo(error, ErrorCodes.CLOUD_TASKS_ERROR, true),
      });
      return [];
    }
  }

  /**
   * 認証情報の検証
   * 本番環境でのトークン取得とプロジェクトアクセスをテスト
   */
  private async validateAuthentication(): Promise<void> {
    try {
      // ADC トラブルシューティング: メタデータサーバーテスト
      if (this.config.nodeEnv === 'production') {
        await this.testMetadataServer();
      }

      // キューリストでプロジェクトアクセスをテスト
      const queuePath = this.client.locationPath(this.config.projectId, this.config.location);
      await this.client.listQueues({ parent: queuePath });
    } catch (error) {
      CloudLogger.error('Cloud Tasks: Authentication test failed', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'auth_failure',
        },
        metadata: {
          projectId: this.config.projectId.substring(0, 8) + '***',
        },
        error: toErrorInfo(error, undefined, false),
      });
    }
  }

  /**
   * メタデータサーバーへのアクセステスト
   * ADC トラブルシューティングガイドに基づく
   */
  private async testMetadataServer(): Promise<void> {
    try {
      // メタデータサーバーからサービスアカウント情報を取得
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email',
        {
          headers: { 'Metadata-Flavor': 'Google' },
        },
      );

      if (!response.ok) {
        CloudLogger.warn('Cloud Tasks: Metadata server access failed', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            processingStage: 'metadata_failure',
          },
          data: {
            response: {
              status: response.status,
              body: response.statusText,
            },
          },
        });
      }
    } catch (error) {
      CloudLogger.error('Cloud Tasks: Metadata server test error', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'metadata_error',
        },
        error: toErrorInfo(error),
      });
    }
  }

  /**
   * タスクIDからタスクの詳細情報を取得
   * デバッグや監視用途で使用
   */
  async getTask(taskId: string): Promise<Task | null> {
    const taskName = this.client.taskPath(
      this.config.projectId,
      this.config.location,
      this.config.queueName,
      taskId,
    );

    if (this.config.enableDebugLogs) {
      CloudLogger.debug('Getting task details', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId,
          queueName: this.config.queueName,
          processingStage: 'get_start',
        },
      });
    }

    try {
      const [task] = await this.client.getTask({ name: taskName });

      return {
        name: task.name || '',
        scheduleTime: task.scheduleTime
          ? new Date(Number(task.scheduleTime.seconds) * 1000)
          : new Date(),
        payload: task.httpRequest?.body
          ? (() => {
            try {
              return JSON.parse(atob(task.httpRequest.body as string));
            } catch {
              return null;
            }
          })()
          : null,
        httpRequest: {
          url: task.httpRequest?.url || '',
          httpMethod: String(task.httpRequest?.httpMethod || 'POST'),
        },
      };
    } catch (error) {
      CloudLogger.error('Failed to get task', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId,
          queueName: this.config.queueName,
          processingStage: 'get_error',
        },
        error: toErrorInfo(error, ErrorCodes.CLOUD_TASKS_ERROR, true),
      });
      return null;
    }
  }
}
