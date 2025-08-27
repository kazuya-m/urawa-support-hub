import { SupabaseClient } from '@supabase/supabase-js';
import { HealthCheckResult, SystemHealth } from '@/domain/entities/SystemHealth.ts';
import { HealthConverter } from './converters/HealthConverter.ts';
import { handleSupabaseError, isNotFoundError } from '../utils/error-handler.ts';

export class HealthRepositoryImpl {
  constructor(private client: SupabaseClient) {}

  async recordDailyExecution(result: HealthCheckResult): Promise<void> {
    const healthRecord = SystemHealth.createFromHealthCheck(result);
    const { error } = await this.client
      .from('system_health')
      .insert(HealthConverter.toDatabaseRow(healthRecord));

    if (error) handleSupabaseError('record health check', error);
  }

  async getLatestHealthRecord(): Promise<SystemHealth | null> {
    const { data, error } = await this.client
      .from('system_health')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      handleSupabaseError('fetch latest health record', error);
    }
    return HealthConverter.toDomainEntity(data);
  }

  async getHealthHistory(days: number): Promise<SystemHealth[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.client
      .from('system_health')
      .select('*')
      .gte('executed_at', cutoffDate.toISOString())
      .order('executed_at', { ascending: false });

    if (error) handleSupabaseError('fetch health history', error);
    return data.map(HealthConverter.toDomainEntity);
  }

  async isSystemHealthy(): Promise<boolean> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await this.client
      .from('system_health')
      .select('id')
      .gte('executed_at', twentyFourHoursAgo.toISOString())
      .limit(1);

    if (error) handleSupabaseError('check system health', error);
    return data.length > 0;
  }

  async cleanupOldRecords(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await this.client
      .from('system_health')
      .delete()
      .lt('executed_at', cutoffDate.toISOString())
      .select('id');

    if (error) handleSupabaseError('cleanup old health records', error);
    return data?.length || 0;
  }
}
