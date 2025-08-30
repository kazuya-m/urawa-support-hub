interface ErrorResponse {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export function handleHealthCheck(): Response {
  try {
    const envCheck = executeHealthCheck(() => checkEnvironmentVariables());
    const supabaseCheck = executeHealthCheck(() => checkSupabaseEnvironment());

    const allHealthy = envCheck.success && supabaseCheck.success;

    return new Response(
      JSON.stringify({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          environment: envCheck.success ? 'ok' : `error: ${envCheck.error}`,
          supabase: supabaseCheck.success ? 'ok' : `error: ${supabaseCheck.error}`,
        },
      }),
      {
        status: allHealthy ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return createErrorResponse(
      'Health check failed',
      error instanceof Error ? error.message : String(error),
      503,
    );
  }
}

function checkEnvironmentVariables(): void {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  for (const varName of requiredVars) {
    if (!Deno.env.get(varName)) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  }
}

function checkSupabaseEnvironment(): void {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not configured');
  }
}

function executeHealthCheck(checkFn: () => void): { success: boolean; error?: string } {
  try {
    checkFn();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createErrorResponse(error: string, details: unknown, status: number): Response {
  const errorResponse: ErrorResponse = {
    error,
    details,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
