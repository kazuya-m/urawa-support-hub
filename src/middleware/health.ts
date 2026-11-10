import { HttpStatusCodes } from '@/shared/constants/HttpStatusCodes.ts';
import { getErrorMessage } from '@/shared/utils/errorUtils.ts';

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

export function handleHealthCheck(): Response {
  const missing = executeHealthCheck(findMissingEnvVar);
  const healthy = missing.success && missing.value === null;

  return new Response(
    JSON.stringify({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        environment: healthy
          ? 'ok'
          : `error: ${
            missing.success
              ? `Required environment variable ${missing.value} is not set`
              : missing.error
          }`,
        supabase: healthy
          ? 'ok'
          : `error: ${
            missing.success ? 'Supabase environment variables not configured' : missing.error
          }`,
      },
    }),
    {
      status: healthy ? HttpStatusCodes.OK : HttpStatusCodes.SERVICE_UNAVAILABLE,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/**
 * 未設定の必須環境変数のうち最初の 1 つを返す（すべて設定済みなら null）
 */
function findMissingEnvVar(): string | null {
  return REQUIRED_ENV_VARS.find((name) => !Deno.env.get(name)) ?? null;
}

function executeHealthCheck<T>(
  checkFn: () => T,
): { success: true; value: T } | { success: false; error: string } {
  try {
    return { success: true, value: checkFn() };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
