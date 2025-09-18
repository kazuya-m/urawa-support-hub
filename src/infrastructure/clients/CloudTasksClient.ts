import { CloudTasksClient as GoogleCloudTasksClient } from '@google-cloud/tasks';
import {
  EnqueueTaskParams,
  ICloudTasksClient,
  Task,
} from '@/infrastructure/interfaces/clients/ICloudTasksClient.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';

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

    CloudLogger.info('Cloud Tasks: Enqueuing task', {
      category: LogCategory.CLOUD_TASKS,
      context: {
        processingStage: 'task_enqueue',
        taskId: actualTaskId,
        payload,
      },
    });
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

    CloudLogger.debug('Enqueuing task', {
      category: LogCategory.CLOUD_TASKS,
      context: {
        taskId: actualTaskId,
        targetUrl,
        queueName: this.config.queueName,
        processingStage: 'enqueue_start',
      },
    });

    // 追加のデバッグ情報を構造化ログで出力
    CloudLogger.debug('Cloud Tasks Configuration Details', {
      category: LogCategory.CLOUD_TASKS,
      context: {
        processingStage: 'config_details',
        taskId: actualTaskId,
        queueName: this.config.queueName,
      },
    });

    // 設定詳細を構造化ログで出力
    CloudLogger.debug('Cloud Tasks: Configuration details', {
      category: LogCategory.CLOUD_TASKS,
      context: {
        processingStage: 'config_details',
        taskId: actualTaskId,
        config: {
          projectId: this.config.projectId.substring(0, 8) + '***',
          location: this.config.location,
          queuePath: queuePath.replace(this.config.projectId, '***'),
          serviceAccountSet: !!Deno.env.get('CLOUD_TASKS_SERVICE_ACCOUNT'),
        },
      },
    });

    try {
      const startTime = Date.now();

      CloudLogger.debug('Cloud Tasks: Sending API request', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'api_request',
          taskId: actualTaskId,
          apiDetails: {
            hasOIDCToken: true,
            serviceAccountEmail: Deno.env.get('CLOUD_TASKS_SERVICE_ACCOUNT'),
            audience: new URL(targetUrl).origin,
            targetUrl: task.httpRequest?.url,
            scheduleTimeValid: scheduledTime > new Date(),
            scheduleTime: scheduledTime.toISOString(),
            currentTime: new Date().toISOString(),
          },
        },
      });

      const [response] = await this.client.createTask({
        parent: queuePath,
        task,
      });

      const duration = Date.now() - startTime;

      CloudLogger.info('Cloud Tasks: API request completed', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'api_success',
          taskId: actualTaskId,
          performance: {
            durationMs: duration,
          },
          result: {
            success: true,
            taskName: response.name,
            scheduleTime: response.scheduleTime,
            createTime: response.createTime,
          },
        },
      });

      if (!response.name) {
        throw new Error('Failed to create task: no task name returned');
      }

      const createdTaskId = response.name.split('/').pop()!;

      CloudLogger.info('Task created successfully', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId: createdTaskId,
          targetUrl,
          queueName: this.config.queueName,
          processingStage: 'enqueue_success',
        },
      });

      return createdTaskId;
    } catch (error) {
      // エラーの詳細情報を構造化ログで出力
      const errorDetails: Record<string, unknown> = {};
      let errorMessage = 'Unknown error';
      let errorCode: string = ErrorCodes.CLOUD_TASKS_ERROR;

      if (error instanceof Error) {
        errorMessage = error.message;

        // Google Cloud エラーの詳細情報を構造化ログで出力
        CloudLogger.error('Google Cloud Tasks API Error Details', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            processingStage: 'api_error_details',
            taskId: actualTaskId,
            queueName: this.config.queueName,
          },
          error: {
            code: 'code' in error ? String(error.code) : ErrorCodes.CLOUD_TASKS_ERROR,
            details: error.message,
            recoverable: true,
          },
        });

        // エラー詳細を構造化ログで出力
        CloudLogger.error('Cloud Tasks: API Error Details', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            processingStage: 'api_error_detailed',
            taskId: actualTaskId,
          },
          error: {
            message: error.message,
            name: error.name,
            grpcCode: 'code' in error ? error.code : 'N/A',
            apiDetails: 'details' in error ? error.details : 'N/A',
            metadata: 'metadata' in error ? error.metadata : 'N/A',
            statusDetails: 'statusDetails' in error ? error.statusDetails : 'N/A',
          },
        });

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
          targetUrl,
          queueName: this.config.queueName,
          processingStage: 'enqueue_error',
        },
        error: {
          code: errorCode,
          details: errorMessage,
          recoverable: errorCode !== ErrorCodes.PERMISSION_DENIED,
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
          queueName: this.config.queueName,
          processingStage: 'dequeue_start',
        },
      });
    }

    try {
      await this.client.deleteTask({ name: taskName });
      if (this.config.enableDebugLogs) {
        CloudLogger.info('Task dequeued successfully', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            taskId,
            queueName: this.config.queueName,
            processingStage: 'dequeue_success',
          },
        });
      }
    } catch (error) {
      CloudLogger.error('Failed to dequeue task', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId,
          queueName: this.config.queueName,
          processingStage: 'dequeue_error',
        },
        error: {
          code: ErrorCodes.CLOUD_TASKS_ERROR,
          details: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      });

      throw new Error(
        `Failed to dequeue task: ${error instanceof Error ? error.message : String(error)}`,
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
        error: {
          code: ErrorCodes.CLOUD_TASKS_ERROR,
          details: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
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
      CloudLogger.debug('Cloud Tasks: Testing authentication', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'auth_test',
        },
      });

      // ADC トラブルシューティング: メタデータサーバーテスト
      if (this.config.nodeEnv === 'production') {
        await this.testMetadataServer();
      }

      // キューリストでプロジェクトアクセスをテスト
      const queuePath = this.client.locationPath(this.config.projectId, this.config.location);
      const [queues] = await this.client.listQueues({ parent: queuePath });

      CloudLogger.info('Cloud Tasks: Authentication test successful', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'auth_success',
          projectId: this.config.projectId.substring(0, 8) + '***',
          location: this.config.location,
          queuesFound: queues.length,
          targetQueue: this.config.queueName,
        },
      });
    } catch (error) {
      CloudLogger.error('Cloud Tasks: Authentication test failed', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'auth_failure',
          projectId: this.config.projectId.substring(0, 8) + '***',
        },
        error: {
          message: error instanceof Error ? error.message : String(error),
          recoverable: false,
        },
      });
    }
  }

  /**
   * メタデータサーバーへのアクセステスト
   * ADC トラブルシューティングガイドに基づく
   */
  private async testMetadataServer(): Promise<void> {
    try {
      CloudLogger.debug('Cloud Tasks: Testing metadata server access', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'metadata_test',
        },
      });

      // メタデータサーバーからサービスアカウント情報を取得
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email',
        {
          headers: { 'Metadata-Flavor': 'Google' },
        },
      );

      if (response.ok) {
        const serviceAccount = await response.text();
        CloudLogger.info('Cloud Tasks: Metadata server access successful', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            processingStage: 'metadata_success',
            serviceAccount: serviceAccount.substring(0, 20) + '***',
            status: response.status,
          },
        });

        // アクセストークンの取得テスト
        const tokenResponse = await fetch(
          'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
          {
            headers: { 'Metadata-Flavor': 'Google' },
          },
        );

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          CloudLogger.debug('Cloud Tasks: Access token retrieval successful', {
            category: LogCategory.CLOUD_TASKS,
            context: {
              processingStage: 'token_success',
              tokenType: tokenData.token_type,
              expiresIn: tokenData.expires_in,
              hasToken: !!tokenData.access_token,
            },
          });
        } else {
          CloudLogger.warn('Cloud Tasks: Access token retrieval failed', {
            category: LogCategory.CLOUD_TASKS,
            context: {
              processingStage: 'token_failure',
              status: tokenResponse.status,
              statusText: tokenResponse.statusText,
            },
          });
        }
      } else {
        CloudLogger.warn('Cloud Tasks: Metadata server access failed', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            processingStage: 'metadata_failure',
            status: response.status,
            statusText: response.statusText,
          },
        });
      }
    } catch (error) {
      CloudLogger.error('Cloud Tasks: Metadata server test error', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          processingStage: 'metadata_error',
        },
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
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
        error: {
          code: ErrorCodes.CLOUD_TASKS_ERROR,
          details: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      });
      return null;
    }
  }
}
