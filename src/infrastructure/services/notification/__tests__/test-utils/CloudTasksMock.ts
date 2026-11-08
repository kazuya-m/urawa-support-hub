import type {
  CloudTasksClient,
  EnqueueTaskParams,
  Task,
} from '@/infrastructure/clients/CloudTasksClient.ts';

export interface MockCloudTasksOptions {
  shouldError?: boolean;
  errorMessage?: string;
  taskId?: string;
}

/**
 * listTasks は本番の CloudTasksClient には無い、登録済みタスクを確認するためのテスト専用ヘルパー
 */
export type MockCloudTasksClient = CloudTasksClient & { listTasks(): Promise<Task[]> };

export function createMockCloudTasksClient(
  options: MockCloudTasksOptions = {},
): MockCloudTasksClient {
  const {
    shouldError = false,
    errorMessage = 'Mock Cloud Tasks error',
    taskId = 'mock-task-id',
  } = options;

  const scheduledTasks: Map<string, EnqueueTaskParams> = new Map();

  const mockClient = {
    enqueueTask(params: EnqueueTaskParams): Promise<string> {
      if (shouldError) {
        return Promise.reject(new Error(errorMessage));
      }
      const actualTaskId = params.taskId || taskId;
      scheduledTasks.set(actualTaskId, params);
      return Promise.resolve(actualTaskId);
    },

    dequeueTask(taskId: string): Promise<void> {
      if (shouldError) {
        return Promise.reject(new Error(errorMessage));
      }
      scheduledTasks.delete(taskId);
      return Promise.resolve();
    },

    listTasks(): Promise<Task[]> {
      if (shouldError) {
        return Promise.reject(new Error(errorMessage));
      }
      const tasks = Array.from(scheduledTasks.entries()).map(([id, params]) => ({
        name: id,
        scheduleTime: params.scheduledTime,
        payload: params.payload,
        httpRequest: {
          url: params.targetUrl,
          httpMethod: params.httpMethod || 'POST',
        },
      }));
      return Promise.resolve(tasks);
    },

    // 内部プロパティ（実際のCloudTasksClientには存在しないが、型の互換性のため）
    get client() {
      return null;
    },
    get projectId() {
      return 'mock-project';
    },
    get location() {
      return 'mock-location';
    },
    get queueName() {
      return 'mock-queue';
    },
    get enableDebugLogs() {
      return false;
    },
  };

  return mockClient as unknown as MockCloudTasksClient;
}
