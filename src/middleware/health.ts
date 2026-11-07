import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';
import { getErrorMessage } from '@/shared/utils/errorUtils.ts';

export function handleHealthCheck(): Response {
  try {
    const envCheck = executeHealthCheck(() => checkEnvironmentVariables());
    const envStatus = envCheck.success ? 'ok' : `error: ${envCheck.error}`;

    return new Response(
      JSON.stringify({
        status: envCheck.success ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          // 応答形式の互換性のため2キーを維持（どちらも同じ環境変数チェックの結果）
          environment: envStatus,
          supabase: envStatus,
        },
      }),
      {
        status: envCheck.success ? HttpStatusCodes.OK : HttpStatusCodes.SERVICE_UNAVAILABLE,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return HttpResponseBuilder.error(
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
