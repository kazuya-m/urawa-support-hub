import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export function getSupabaseAdminClient(): SupabaseClient {
  sharedAdminClient ??= createSupabaseAdminClient();
  return sharedAdminClient;
}

export function resetSupabaseAdminClientForTest(): void {
  sharedAdminClient = null;
}
