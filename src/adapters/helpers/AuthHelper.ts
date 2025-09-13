/**
 * 認証関連のヘルパー関数
 */
export class AuthHelper {
  /**
   * Cloud Schedulerからのリクエストを認証
   */
  static validateCloudSchedulerRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization');
    const nodeEnv = Deno.env.get('NODE_ENV') || 'production';

    // 開発環境でも最低限の認証チェックを実施
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      // 開発環境では認証ヘッダーの存在のみチェック
      return !!authHeader;
    }

    // 本番環境では厳密な認証チェック
    return !!authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 7;
  }

  /**
   * Cloud Tasksからのリクエストを認証
   */
  static validateCloudTasksRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization');
    const nodeEnv = Deno.env.get('NODE_ENV') || 'production';

    // 開発環境でも最低限の認証チェックを実施
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      // 開発環境では認証ヘッダーの存在のみチェック
      return !!authHeader;
    }

    // 本番環境では厳密な認証チェック
    return !!authHeader && (
      (authHeader.startsWith('Bearer ') && authHeader.length > 7) ||
      (authHeader.startsWith('OAuth ') && authHeader.length > 6)
    );
  }
}
