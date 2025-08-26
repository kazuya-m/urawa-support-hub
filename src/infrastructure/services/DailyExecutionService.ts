import { ScrapingService } from './ScrapingService.ts';
import { HealthRepository } from '@/domain/interfaces/HealthRepository.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

export class DailyExecutionService {
  constructor(
    private scrapingService: ScrapingService,
    private healthRepository: HealthRepository,
  ) {}

  /**
   * 毎日実行される処理
   * - チケットスクレイピング実行
   * - 実行結果をsystem_healthテーブルに記録（Supabase無料枠自動停止対策）
   */
  async executeDaily(): Promise<void> {
    const startTime = Date.now();
    let executionResult: HealthCheckResult;

    try {
      // チケットスクレイピングを実行
      const tickets = await this.scrapingService.scrapeAwayTickets();

      const executionDuration = Date.now() - startTime;

      // 成功時のヘルスチェック結果
      executionResult = {
        executedAt: new Date(),
        ticketsFound: tickets.length,
        status: 'success',
        executionDurationMs: executionDuration,
      };

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Daily execution completed successfully. Found ${tickets.length} tickets in ${executionDuration}ms`,
        );
      }
    } catch (error) {
      const executionDuration = Date.now() - startTime;

      // エラー時のヘルスチェック結果
      executionResult = {
        executedAt: new Date(),
        ticketsFound: 0,
        status: 'error',
        executionDurationMs: executionDuration,
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.error(`Daily execution failed after ${executionDuration}ms:`, error);
      }

      // エラーは再スローして上位で処理させるが、まずヘルスチェックを記録
    }

    try {
      // 成功・失敗に関わらず、必ずヘルスチェック結果を記録
      // これによりSupabaseが7日間非アクティブで停止されることを防ぐ
      await this.healthRepository.recordDailyExecution(executionResult);

      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Health check recorded: status=${executionResult.status}, tickets=${executionResult.ticketsFound}`,
        );
      }
    } catch (healthError) {
      // ヘルスチェック記録が失敗した場合は重大なエラー
      console.error(
        'CRITICAL: Failed to record health check - Supabase may auto-pause:',
        healthError,
      );
      handleSupabaseError('record daily health check', healthError as Error);
    }

    // スクレイピングでエラーが発生していた場合は再スロー
    if (executionResult.status === 'error') {
      throw new Error(executionResult.errorDetails?.message as string);
    }
  }

  /**
   * システムヘルス状態を確認
   */
  async checkSystemHealth(): Promise<{
    isHealthy: boolean;
    lastExecution?: Date;
    daysSinceLastExecution?: number;
  }> {
    try {
      const isHealthy = await this.healthRepository.isSystemHealthy();
      const latestRecord = await this.healthRepository.getLatestHealthRecord();

      if (!latestRecord) {
        return { isHealthy: false };
      }

      const daysSince = Math.floor(
        (Date.now() - latestRecord.executedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        isHealthy,
        lastExecution: latestRecord.executedAt,
        daysSinceLastExecution: daysSince,
      };
    } catch (error) {
      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.error('Failed to check system health:', error);
      }
      return { isHealthy: false };
    }
  }

  /**
   * 古いヘルスレコードをクリーンアップ（デフォルト30日）
   */
  async cleanupOldHealthRecords(retentionDays: number = 30): Promise<number> {
    try {
      const deletedCount = await this.healthRepository.cleanupOldRecords(retentionDays);
      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.log(
          `Cleaned up ${deletedCount} old health records (older than ${retentionDays} days)`,
        );
      }
      return deletedCount;
    } catch (error) {
      if (Deno.env.get('NODE_ENV') !== 'production') {
        console.error('Failed to cleanup old health records:', error);
      }
      return 0;
    }
  }
}
