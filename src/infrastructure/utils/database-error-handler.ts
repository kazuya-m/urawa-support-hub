import { DatabaseError } from '@/shared/errors/index.ts';
import { type ErrorCode, ErrorCodes } from '@/shared/errors/ErrorCodes.ts';

/**
 * Supabaseエラーのタイプ定義
 */
interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Supabaseのエラーコードを内部エラーコードに変換
 */
function mapSupabaseErrorCode(supabaseCode?: string, operation?: string): ErrorCode {
  // Supabaseのエラーコードマッピング
  if (supabaseCode === 'PGRST116') return ErrorCodes.DB_NOT_FOUND;
  if (supabaseCode === '23505') return ErrorCodes.DB_SAVE_ERROR; // unique violation
  if (supabaseCode === '23503') return ErrorCodes.DB_SAVE_ERROR; // foreign key violation

  // 操作タイプによるデフォルトマッピング
  if (operation?.includes('save') || operation?.includes('insert')) return ErrorCodes.DB_SAVE_ERROR;
  if (operation?.includes('update')) return ErrorCodes.DB_UPDATE_ERROR;
  if (operation?.includes('delete')) return ErrorCodes.DB_DELETE_ERROR;
  if (operation?.includes('fetch') || operation?.includes('find')) return ErrorCodes.DB_FETCH_ERROR;

  return ErrorCodes.DB_CONNECTION_ERROR;
}

/**
 * Supabaseエラーを DatabaseError に変換してthrow
 */
export function throwDatabaseError(
  repository: string,
  operation: string,
  error: SupabaseError,
  context?: Record<string, unknown>,
): never {
  const errorCode = mapSupabaseErrorCode(error.code, operation);

  throw new DatabaseError(
    repository,
    operation,
    error.message,
    errorCode,
    error as Error,
    {
      ...context,
      supabaseCode: error.code,
      details: error.details,
      hint: error.hint,
    },
  );
}

/**
 * データが見つからないエラーかチェック
 */
export function isNotFoundError(error: SupabaseError): boolean {
  return error.code === 'PGRST116';
}
