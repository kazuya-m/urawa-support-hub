import { CloudTasksClient as GoogleCloudTasksClient } from '@google-cloud/tasks';

/**
 * Cloud Tasksでスケジュールされるタスク情報
 */
export interface Task {
  name: string;
  scheduleTime: Date;
  payload: unknown;
  httpRequest: {
    url: string;
    httpMethod: string;
  };
}

/**
 * タスクをキューに追加するためのパラメータ
 */
export interface EnqueueTaskParams {
  taskId?: string;
  payload: unknown;
  scheduledTime: Date;
  targetUrl: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
}

/**
 * Google Cloud Tasks クライアント
 * Google Cloud Tasks APIを使用してタスクの管理を行う
 * gRPC接続問題を回避するためREST fallbackを使用
 */
export class CloudTasksClient {
  private client: GoogleCloudTasksClient;
  private projectId: string;
  private location: string;
  private queueName: string;
  private readonly enableDebugLogs: boolean;

  constructor(
    projectId?: string,
    location?: string,
    queueName?: string,
  ) {
    this.projectId = projectId || Deno.env.get('GOOGLE_CLOUD_PROJECT') ||
      Deno.env.get('GCP_PROJECT_ID') || '';
    this.location = location || Deno.env.get('CLOUD_TASKS_LOCATION') ||
      Deno.env.get('GCP_REGION') || 'asia-northeast1';
    this.queueName = queueName || 'notifications';
    this.enableDebugLogs = Deno.env.get('CLOUD_TASKS_DEBUG') === 'true';

    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID environment variable is required');
    }

    // Initialize Google Cloud Tasks client with environment-specific settings
    const denoEnv = Deno.env.get('DENO_ENV') || 'development';

    // 開発環境では強制REST、本番環境ではgRPC優先・REST fallback
    const clientOptions = denoEnv === 'development'
      ? { fallback: 'rest' as const } // 開発環境: 強制REST使用
      : { fallback: true }; // 本番環境: gRPC優先、失敗時REST

    this.client = new GoogleCloudTasksClient(clientOptions);

    if (this.enableDebugLogs) {
      console.log(`[CloudTasks] Environment: ${denoEnv}`);
      console.log(
        `[CloudTasks] Using: ${
          denoEnv === 'development' ? 'REST API (forced)' : 'gRPC with REST fallback'
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
    const queuePath = this.client.queuePath(this.projectId, this.location, this.queueName);

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

    if (this.enableDebugLogs) {
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
      if (this.enableDebugLogs) {
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
    const taskName = this.client.taskPath(this.projectId, this.location, this.queueName, taskId);

    if (this.enableDebugLogs) {
      console.log(`[CloudTasks] Dequeuing task: ${taskId}`);
    }

    try {
      await this.client.deleteTask({ name: taskName });
      if (this.enableDebugLogs) {
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
    const queue = queueName || this.queueName;
    const queuePath = this.client.queuePath(this.projectId, this.location, queue);

    if (this.enableDebugLogs) {
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
    const taskName = this.client.taskPath(this.projectId, this.location, this.queueName, taskId);

    if (this.enableDebugLogs) {
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
