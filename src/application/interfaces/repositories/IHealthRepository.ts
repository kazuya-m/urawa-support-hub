import { HealthCheckResult, SystemHealth } from '@/domain/entities/SystemHealth.ts';

export interface IHealthRepository {
  recordDailyExecution(result: HealthCheckResult): Promise<void>;
  getLatestHealthRecord(): Promise<SystemHealth | null>;
  getHealthHistory(days: number): Promise<SystemHealth[]>;
  isSystemHealthy(): Promise<boolean>;
  cleanupOldRecords(retentionDays: number): Promise<number>;
}
