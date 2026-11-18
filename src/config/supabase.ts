import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * 管理者用Supabaseクライアント（緊急時のみ）
 * 呼ぶたびに新しいクライアントを作る。アプリからは getSupabaseAdminClient を使う
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
    );
  }

  if (Deno.env.get('NODE_ENV') !== 'production') {
    console.warn('WARNING: Using admin client with RLS bypass');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let sharedAdminClient: SupabaseClient | null = null;

/**
 * プロセス内で共有する管理者用Supabaseクライアント
 * - 初回の呼び出しで作る（環境変数がなくても起動と /health は動く）
 * - 作成に失敗したら保持しない（環境変数を直せば次の呼び出しで作れる）
 */
export function getSupabaseAdminClient(): SupabaseClient {
  sharedAdminClient ??= createSupabaseAdminClient();
  return sharedAdminClient;
}

/**
 * 共有クライアントを捨てる（テスト用）
 */
export function resetSupabaseAdminClientForTest(): void {
  sharedAdminClient = null;
}
