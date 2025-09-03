import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * テスト用のSupabaseクライアントを作成する
 * 統合テストではSERVICE_ROLE_KEYを使用してRLS制限を回避
 */
export function createTestSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false, // Disable auto refresh to prevent test leaks
      persistSession: false, // Don't persist sessions in tests
    },
  });
}

/**
 * テスト用のクリーンアップヘルパー（条件指定で削除）
 * @param condition - WHERE句に相当する条件（例: "id = 'test-001'" または "match_name = 'テスト試合'"）
 */
export async function cleanupTestData(
  client: SupabaseClient,
  table: string,
  condition?: string,
) {
  try {
    if (condition) {
      // 条件文字列をパースして適用
      const match = condition.match(/(\w+)\s*=\s*'([^']+)'/);
      if (match) {
        const [, column, value] = match;
        await client.from(table).delete().eq(column, value);
      }
    } else {
      // 条件なしの場合はテーブル全体をクリア（危険なので通常は使わない）
      console.warn(`Clearing entire ${table} table - use with caution`);
      await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
  } catch (error) {
    console.error(`Cleanup failed for ${table}:`, error);
  }
}

/**
 * 特定のIDでテストデータをクリーンアップ
 */
export async function cleanupTestDataById(
  client: SupabaseClient,
  table: string,
  id: string,
) {
  try {
    await client.from(table).delete().eq('id', id);
  } catch (error) {
    console.error(`Cleanup failed for ${table}:${id}:`, error);
  }
}

/**
 * テーブル全体をクリーンアップ（テスト用）
 */
export async function cleanupTestTable(client: SupabaseClient, table: string) {
  try {
    await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.error(`Table cleanup failed for ${table}:`, error);
  }
}

/**
 * テストのセットアップとクリーンアップを自動化するヘルパー
 * @param testIds - クリーンアップ対象のID配列
 * @param testFn - テスト関数
 */
export async function withTestCleanup(
  table: string,
  testIds: string[],
  testFn: (client: SupabaseClient) => Promise<void>,
) {
  const client = createTestSupabaseClient();

  // 事前クリーンアップ（前回のテスト実行でデータが残っている可能性）
  for (const id of testIds) {
    await cleanupTestDataById(client, table, id);
  }

  try {
    await testFn(client);
  } finally {
    // 事後クリーンアップ
    for (const id of testIds) {
      await cleanupTestDataById(client, table, id);
    }
  }
}

/**
 * 複数のIDを一括でクリーンアップ
 */
export async function cleanupMultipleTestData(
  client: SupabaseClient,
  table: string,
  ids: string[],
) {
  for (const id of ids) {
    await cleanupTestDataById(client, table, id);
  }
}

/**
 * テストの前後でクリーンアップを実行するヘルパー
 * @param setup - セットアップ時にクリーンアップするか
 * @param teardown - ティアダウン時にクリーンアップするか
 */
export function createTestWithCleanup(
  table: string,
  ids: string[],
  options: { setup?: boolean; teardown?: boolean } = { setup: true, teardown: true },
) {
  return async (testFn: (client: SupabaseClient) => Promise<void>) => {
    const client = createTestSupabaseClient();

    if (options.setup) {
      await cleanupMultipleTestData(client, table, ids);
    }

    try {
      await testFn(client);
    } finally {
      if (options.teardown) {
        await cleanupMultipleTestData(client, table, ids);
      }
    }
  };
}
