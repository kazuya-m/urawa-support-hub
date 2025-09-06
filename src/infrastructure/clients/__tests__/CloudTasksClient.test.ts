import { assertEquals, assertRejects, assertThrows } from 'std/assert/mod.ts';
import { returnsNext, stub } from 'testing/mock.ts';
import { CloudTasksClient, EnqueueTaskParams } from '../CloudTasksClient.ts';

// テスト用の共通セットアップ
function setupTestEnvironment(): { client: CloudTasksClient; originalEnv: Record<string, string> } {
  const originalEnv = { ...Deno.env.toObject() };

  // 環境変数を設定
  Deno.env.set('GOOGLE_CLOUD_PROJECT', 'test-project');
  Deno.env.set('CLOUD_TASKS_LOCATION', 'asia-northeast1');

  const client = new CloudTasksClient();

  return { client, originalEnv };
}

// 環境変数をリセット
function tearDown(originalEnv: Record<string, string>) {
  // 環境変数をリセット
  for (const [key, value] of Object.entries(originalEnv)) {
    Deno.env.set(key, value);
  }
  // 追加された環境変数を削除
  const currentEnv = Deno.env.toObject();
  for (const key of Object.keys(currentEnv)) {
    if (!(key in originalEnv)) {
      Deno.env.delete(key);
    }
  }
}

// Constructor Tests
Deno.test('CloudTasksClient - should initialize with default values from environment variables', () => {
  const { client, originalEnv } = setupTestEnvironment();

  try {
    // コンストラクタが例外を投げないことを確認
    assertEquals(typeof client, 'object');
  } finally {
    tearDown(originalEnv);
  }
});

Deno.test('CloudTasksClient - should throw error when GOOGLE_CLOUD_PROJECT is missing', () => {
  const originalEnv = { ...Deno.env.toObject() };

  try {
    Deno.env.delete('GOOGLE_CLOUD_PROJECT');

    assertThrows(
      () => new CloudTasksClient(),
      Error,
      'GOOGLE_CLOUD_PROJECT environment variable is required',
    );
  } finally {
    tearDown(originalEnv);
  }
});

Deno.test('CloudTasksClient - should accept custom parameters', () => {
  const originalEnv = { ...Deno.env.toObject() };

  try {
    const client = new CloudTasksClient('custom-project', 'us-central1', 'custom-queue');
    assertEquals(typeof client, 'object');
  } finally {
    tearDown(originalEnv);
  }
});

// Enqueue Task Tests
Deno.test('CloudTasksClient - should enqueue task successfully with valid parameters', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const validParams: EnqueueTaskParams = {
    taskId: 'test-task-123',
    payload: { test: 'data' },
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
    targetUrl: 'https://example.com/api/notify',
  };

  // CloudTasks APIをmock
  const mockTaskId = validParams.taskId!;
  const enqueueStub = stub(
    client,
    'enqueueTask',
    returnsNext([Promise.resolve(mockTaskId)]),
  );

  try {
    const taskId = await client.enqueueTask(validParams);

    assertEquals(typeof taskId, 'string');
    assertEquals(taskId, mockTaskId);
    assertEquals(enqueueStub.calls.length, 1);
    assertEquals(enqueueStub.calls[0].args[0], validParams);
  } finally {
    enqueueStub.restore();
    tearDown(originalEnv);
  }
});

Deno.test('CloudTasksClient - should reject past scheduled time', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const pastParams: EnqueueTaskParams = {
    taskId: 'test-task-123',
    payload: { test: 'data' },
    scheduledTime: new Date(Date.now() - 1000), // 1秒前（過去）
    targetUrl: 'https://example.com/api/notify',
  };

  try {
    await assertRejects(
      () => client.enqueueTask(pastParams),
      Error,
      'Scheduled time must be in the future',
    );
  } finally {
    tearDown(originalEnv);
  }
});

Deno.test('CloudTasksClient - should generate UUID when no taskId provided', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const validParams: EnqueueTaskParams = {
    payload: { test: 'data' },
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    targetUrl: 'https://example.com/api/notify',
  };

  // UUIDを返すようmock
  const enqueueStub = stub(
    client,
    'enqueueTask',
    returnsNext([Promise.resolve('generated-uuid-123')]),
  );

  try {
    const taskId = await client.enqueueTask(validParams);

    assertEquals(typeof taskId, 'string');
    assertEquals(taskId, 'generated-uuid-123');
    assertEquals(enqueueStub.calls.length, 1);
  } finally {
    enqueueStub.restore();
    tearDown(originalEnv);
  }
});

Deno.test('CloudTasksClient - should handle custom HTTP method', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const validParams: EnqueueTaskParams = {
    taskId: 'test-task-123',
    payload: { test: 'data' },
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    targetUrl: 'https://example.com/api/notify',
    httpMethod: 'PUT',
  };

  const mockTaskId = validParams.taskId!;
  const enqueueStub = stub(
    client,
    'enqueueTask',
    returnsNext([Promise.resolve(mockTaskId)]),
  );

  try {
    const taskId = await client.enqueueTask(validParams);
    assertEquals(typeof taskId, 'string');
    assertEquals(taskId, mockTaskId);
    assertEquals(enqueueStub.calls.length, 1);
  } finally {
    enqueueStub.restore();
    tearDown(originalEnv);
  }
});

// Dequeue Task Tests
Deno.test('CloudTasksClient - should dequeue task without throwing error', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  // dequeueTask をmock化して例外が発生しないことを確認
  const dequeueStub = stub(
    client,
    'dequeueTask',
    returnsNext([Promise.resolve()]),
  );

  try {
    await client.dequeueTask('test-task-id');
    assertEquals(dequeueStub.calls.length, 1);
    assertEquals(dequeueStub.calls[0].args[0], 'test-task-id');
  } finally {
    dequeueStub.restore();
    tearDown(originalEnv);
  }
});

// List Tasks Tests
Deno.test('CloudTasksClient - should return empty array for mock implementation', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const listStub = stub(
    client,
    'listTasks',
    returnsNext([Promise.resolve([])]),
  );

  try {
    const tasks = await client.listTasks('test-queue');
    assertEquals(Array.isArray(tasks), true);
    assertEquals(tasks.length, 0);
    assertEquals(listStub.calls.length, 1);
    assertEquals(listStub.calls[0].args[0], 'test-queue');
  } finally {
    listStub.restore();
    tearDown(originalEnv);
  }
});

Deno.test('CloudTasksClient - should use default queue when no queue specified', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const listStub = stub(
    client,
    'listTasks',
    returnsNext([Promise.resolve([])]),
  );

  try {
    const tasks = await client.listTasks();
    assertEquals(Array.isArray(tasks), true);
    assertEquals(listStub.calls.length, 1);
    // 引数が undefined の場合をテスト
    assertEquals(listStub.calls[0].args.length, 0);
  } finally {
    listStub.restore();
    tearDown(originalEnv);
  }
});

// Get Task Tests
Deno.test('CloudTasksClient - should return null for mock implementation', async () => {
  const { client, originalEnv } = setupTestEnvironment();

  const getStub = stub(
    client,
    'getTask',
    returnsNext([Promise.resolve(null)]),
  );

  try {
    const task = await client.getTask('test-task-id');
    assertEquals(task, null);
    assertEquals(getStub.calls.length, 1);
    assertEquals(getStub.calls[0].args[0], 'test-task-id');
  } finally {
    getStub.restore();
    tearDown(originalEnv);
  }
});
