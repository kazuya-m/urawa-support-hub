/**
 * Repository操作のエラーハンドリングユーティリティ
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Supabaseエラーのタイプ定義
 */
interface SupabaseError {
  message: string;
  code?: string;
}

/**
 * Supabaseエラーを統一したRepositoryErrorに変換
 */
export function handleSupabaseError(operation: string, error: SupabaseError): never {
  const message = `Failed to ${operation}: ${error.message}`;
  throw new RepositoryError(message, operation, error as Error);
}

/**
 * 共通のnot foundチェック
 */
export function isNotFoundError(error: SupabaseError): boolean {
  return error.code === 'PGRST116'; // Postgrest "not found" error code
}