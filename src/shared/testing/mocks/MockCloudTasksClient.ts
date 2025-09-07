import {
  EnqueueTaskParams,
  ICloudTasksClient,
  Task,
} from '@/infrastructure/interfaces/clients/ICloudTasksClient.ts';

export class MockCloudTasksClient implements ICloudTasksClient {
  private tasks: Map<string, Task> = new Map();
  private shouldThrowError = false;
  private errorMessage = 'Mock Cloud Tasks error';

  async enqueueTask(params: EnqueueTaskParams): Promise<string> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    const taskId = params.taskId || crypto.randomUUID();
    const task: Task = {
      name: `projects/mock-project/locations/mock-location/queues/mock-queue/tasks/${taskId}`,
      scheduleTime: params.scheduledTime,
      payload: params.payload,
      httpRequest: {
        url: params.targetUrl,
        httpMethod: params.httpMethod || 'POST',
      },
    };

    this.tasks.set(taskId, task);
    await Promise.resolve();
    return taskId;
  }

  async dequeueTask(taskId: string): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.tasks.delete(taskId);
    await Promise.resolve();
  }

  async listTasks(): Promise<Task[]> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    await Promise.resolve();
    return Array.from(this.tasks.values());
  }

  async getTask(taskId: string): Promise<Task | null> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    await Promise.resolve();
    return this.tasks.get(taskId) || null;
  }

  // テスト用確認メソッド
  getAllTasks(): Map<string, Task> {
    return new Map(this.tasks);
  }

  hasTask(taskId: string): boolean {
    return this.tasks.has(taskId);
  }

  getTaskCount(): number {
    return this.tasks.size;
  }

  // テスト用設定メソッド
  setShouldThrowError(shouldThrow: boolean, message = 'Mock Cloud Tasks error'): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  clear(): void {
    this.tasks.clear();
    this.shouldThrowError = false;
  }
}
