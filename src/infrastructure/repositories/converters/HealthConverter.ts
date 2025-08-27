import { SystemHealth } from '@/domain/entities/SystemHealth.ts';

export interface DatabaseHealthRow {
  id: string;
  executed_at: string;
  tickets_found: number;
  status: string;
  execution_duration_ms?: number;
  error_details?: Record<string, unknown>;
  created_at: string;
}

export class HealthConverter {
  static toDomainEntity(row: DatabaseHealthRow): SystemHealth {
    return new SystemHealth({
      id: row.id,
      executedAt: new Date(row.executed_at),
      ticketsFound: row.tickets_found,
      status: row.status as 'success' | 'error' | 'partial',
      executionDurationMs: row.execution_duration_ms,
      errorDetails: row.error_details,
      createdAt: new Date(row.created_at),
    });
  }

  static toDatabaseRow(health: SystemHealth): Omit<DatabaseHealthRow, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  } {
    const props = health.toPlainObject();
    return {
      id: props.id,
      executed_at: props.executedAt.toISOString(),
      tickets_found: props.ticketsFound,
      status: props.status,
      execution_duration_ms: props.executionDurationMs,
      error_details: props.errorDetails,
      created_at: props.createdAt.toISOString(),
    };
  }
}
