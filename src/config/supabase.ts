import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAppConfig } from '@/config/app-config.ts';

export function createSupabaseAdminClient(): SupabaseClient {
  const config = getAppConfig();
  const supabaseUrl = config.supabase.url;
  const supabaseServiceKey = config.supabase.serviceRoleKey;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
    );
  }

  if (config.nodeEnv !== 'production') {
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

export function getSupabaseAdminClient(): SupabaseClient {
  sharedAdminClient ??= createSupabaseAdminClient();
  return sharedAdminClient;
}

export function resetSupabaseAdminClientForTest(): void {
  sharedAdminClient = null;
}
