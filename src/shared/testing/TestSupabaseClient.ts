/**
 * テスト用Supabaseクライアント
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * テスト用のSupabaseクライアントを作成
 * 必要に応じてローカルSupabaseインスタンスに接続
 */
export function createTestSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'test-anon-key';

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * テスト用のSupabaseサービスロールクライアントを作成
 */
export function createTestSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'test-service-role-key';

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * テストデータのクリーンアップ
 */
export async function cleanupTestData(client: SupabaseClient): Promise<void> {
  // テストで作成されたデータを削除
  await client.from('notification_history').delete().like('id', 'test-%');
  await client.from('tickets').delete().like('id', 'test-%');
}
