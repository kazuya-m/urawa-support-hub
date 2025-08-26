import { HealthCheckResult, SystemHealth } from '../entities/SystemHealth.ts';

export interface HealthRepository {
  /**
   * ヘルスチェック結果を記録
   */
  recordDailyExecution(result: HealthCheckResult): Promise<void>;

  /**
   * 最新のヘルスチェック結果を取得
   */
  getLatestHealthRecord(): Promise<SystemHealth | null>;

  /**
   * 指定期間のヘルスチェック履歴を取得
   */
  getHealthHistory(days: number): Promise<SystemHealth[]>;

  /**
   * システムが健全かどうかを確認
   * 直近24時間以内にヘルスチェックが実行されているかチェック
   */
  isSystemHealthy(): Promise<boolean>;

  /**
   * 古いヘルスレコードをクリーンアップ
   * 指定日数より古いレコードを削除
   */
  cleanupOldRecords(retentionDays: number): Promise<number>;
}
