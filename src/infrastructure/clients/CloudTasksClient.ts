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

    if (this.config.enableDebugLogs && this.config.nodeEnv !== 'production') {
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
    console.log('Enqueuing task with ID:', actualTaskId);
    console.log('Payload:', payload);
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

    if (this.config.enableDebugLogs) {
      CloudLogger.debug('Enqueuing task', {
        category: LogCategory.CLOUD_TASKS,
        context: {
          taskId: actualTaskId,
          targetUrl,
          queueName: this.config.queueName,
          processingStage: 'enqueue_start',
        },
      });
    }

    try {
      const [response] = await this.client.createTask({
        parent: queuePath,
        task,
      });

      if (!response.name) {
        throw new Error('Failed to create task: no task name returned');
      }

      const createdTaskId = response.name.split('/').pop()!;
      if (this.config.enableDebugLogs) {
        CloudLogger.info('Task created successfully', {
          category: LogCategory.CLOUD_TASKS,
          context: {
            taskId: createdTaskId,
            targetUrl,
            queueName: this.config.queueName,
            processingStage: 'enqueue_success',
          },
        });
      }

      return createdTaskId;
    } catch (error) {
      // エラーの詳細情報を構造化ログで出力
      const errorDetails: Record<string, unknown> = {};
      let errorMessage = 'Unknown error';
      let errorCode: string = ErrorCodes.CLOUD_TASKS_ERROR;

      if (error instanceof Error) {
        errorMessage = error.message;
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
