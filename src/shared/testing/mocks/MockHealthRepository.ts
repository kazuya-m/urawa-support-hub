import { HealthCheckResult, SystemHealth } from '@/domain/entities/SystemHealth.ts';
import { IHealthRepository } from '@/application/interfaces/repositories/IHealthRepository.ts';

export class MockHealthRepository implements IHealthRepository {
  private executions: HealthCheckResult[] = [];

  async recordDailyExecution(result: HealthCheckResult): Promise<void> {
    this.executions.push(result);
    await Promise.resolve();
  }

  async getLatestHealthRecord(): Promise<SystemHealth | null> {
    await Promise.resolve();
    const latest = this.executions[this.executions.length - 1];
    if (!latest) return null;

    return SystemHealth.createFromHealthCheck(latest);
  }

  async getHealthHistory(days: number): Promise<SystemHealth[]> {
    await Promise.resolve();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.executions
      .filter((execution) => execution.executedAt >= cutoffDate)
      .map((execution) => SystemHealth.createFromHealthCheck(execution));
  }

  async isSystemHealthy(): Promise<boolean> {
    await Promise.resolve();
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    return this.executions.some((execution) => execution.executedAt >= twentyFourHoursAgo);
  }

  async cleanupOldRecords(retentionDays: number): Promise<number> {
    await Promise.resolve();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const initialCount = this.executions.length;
    this.executions = this.executions.filter((execution) => execution.executedAt >= cutoffDate);

    return initialCount - this.executions.length;
  }

  // テスト用ヘルパーメソッド
  clear(): void {
    this.executions = [];
  }

  setExecutions(executions: HealthCheckResult[]): void {
    this.executions = [...executions];
  }
}
