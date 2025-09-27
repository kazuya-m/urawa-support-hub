export interface Task {
  name: string;
  scheduleTime: Date;
  payload: unknown;
  httpRequest: {
    url: string;
    httpMethod: string;
  };
}

export interface EnqueueTaskParams {
  taskId?: string;
  payload: unknown;
  scheduledTime: Date;
  targetUrl: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
}

export interface ICloudTasksClient {
  enqueueTask(params: EnqueueTaskParams): Promise<string>;
  dequeueTask(taskId: string): Promise<void>;
  listTasks(queueName?: string): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
}
