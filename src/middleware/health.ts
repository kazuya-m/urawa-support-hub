import { HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';
import { getErrorMessage } from '@/shared/utils/errorUtils.ts';

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
        status: allHealthy ? HttpStatusCodes.OK : HttpStatusCodes.SERVICE_UNAVAILABLE,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return createErrorResponse(
      'Health check failed',
      getErrorMessage(error),
      HttpStatusCodes.SERVICE_UNAVAILABLE,
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
      error: getErrorMessage(error),
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
