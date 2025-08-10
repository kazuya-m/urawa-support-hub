import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * テスト用のSupabaseクライアントを作成する
 * 統合テストではSERVICE_ROLE_KEYを使用してRLS制限を回避
 */
export function createTestSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * テスト用のクリーンアップヘルパー
 */
export async function cleanupTestData(client: SupabaseClient, table: string, id: string) {
  try {
    await client.from(table).delete().eq('id', id);
  } catch (error) {
    console.error(`Cleanup failed for ${table}:${id}:`, error);
  }
}
