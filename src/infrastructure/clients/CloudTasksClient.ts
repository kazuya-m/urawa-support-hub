import { CloudTasksClient as GoogleCloudTasksClient } from '@google-cloud/tasks';
import {
  EnqueueTaskParams,
  ICloudTasksClient,
  Task,
} from '@/infrastructure/interfaces/clients/ICloudTasksClient.ts';

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

    const clientOptions = this.config.nodeEnv === 'development'
      ? { fallback: 'rest' as const }
      : { fallback: true };

    this.client = new GoogleCloudTasksClient(clientOptions);

    if (this.config.enableDebugLogs && this.config.nodeEnv !== 'production') {
      console.log(`[CloudTasks] Environment: ${this.config.nodeEnv}`);
      console.log(
        `[CloudTasks] Using: ${
          this.config.nodeEnv === 'development' ? 'REST API (forced)' : 'gRPC with REST fallback'
        }`,
      );
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
        },
      },
    };

    if (this.config.enableDebugLogs) {
      console.log(`[CloudTasks] Enqueuing task: ${actualTaskId}`);
      console.log(`[CloudTasks] Target URL: ${targetUrl}`);
      console.log(`[CloudTasks] Scheduled time: ${scheduledTime.toISOString()}`);
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
        console.log(`[CloudTasks] Task created successfully: ${createdTaskId}`);
      }

      return createdTaskId;
    } catch (error) {
      console.error(`[CloudTasks] Failed to enqueue task: ${actualTaskId}`, error);
      throw new Error(
        `Failed to enqueue task: ${error instanceof Error ? error.message : String(error)}`,
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
      console.log(`[CloudTasks] Dequeuing task: ${taskId}`);
    }

    try {
      await this.client.deleteTask({ name: taskName });
      if (this.config.enableDebugLogs) {
        console.log(`[CloudTasks] Task dequeued successfully: ${taskId}`);
      }
    } catch (error) {
      console.error(`[CloudTasks] Failed to dequeue task: ${taskId}`, error);
      throw new Error(
        `Failed to dequeue task: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async listTasks(queueName?: string): Promise<Task[]> {
    const queue = queueName || this.config.queueName;
    const queuePath = this.client.queuePath(this.config.projectId, this.config.location, queue);

    if (this.config.enableDebugLogs) {
      console.log(`[CloudTasks] Listing tasks in queue: ${queue}`);
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
      console.error(`[CloudTasks] Failed to list tasks in queue: ${queue}`, error);
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
      console.log(`[CloudTasks] Getting task: ${taskId}`);
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
      console.error(`[CloudTasks] Failed to get task: ${taskId}`, error);
      return null;
    }
  }
}
