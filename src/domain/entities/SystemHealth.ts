interface SystemHealthProps {
  id: string;
  executedAt: Date;
  ticketsFound: number;
  status: SystemHealthStatus;
  executionDurationMs?: number;
  errorDetails?: Record<string, unknown>;
  createdAt: Date;
}

export type SystemHealthStatus = 'success' | 'error' | 'partial';

export interface HealthCheckResult {
  executedAt: Date;
  ticketsFound: number;
  status: SystemHealthStatus;
  executionDurationMs?: number;
  errorDetails?: Record<string, unknown>;
}

export class SystemHealth {
  private readonly props: SystemHealthProps;

  constructor(props: SystemHealthProps) {
    this.validateHealthData(props);
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }

  get executedAt(): Date {
    return this.props.executedAt;
  }

  get ticketsFound(): number {
    return this.props.ticketsFound;
  }

  get status(): SystemHealthStatus {
    return this.props.status;
  }

  get executionDurationMs(): number | undefined {
    return this.props.executionDurationMs;
  }

  get errorDetails(): Record<string, unknown> | undefined {
    return this.props.errorDetails ? { ...this.props.errorDetails } : undefined;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isHealthy(): boolean {
    return this.props.status === 'success';
  }

  hasErrors(): boolean {
    return this.props.status === 'error';
  }

  static createFromHealthCheck(result: HealthCheckResult): SystemHealth {
    return new SystemHealth({
      id: crypto.randomUUID(),
      ...result,
      createdAt: new Date(),
    });
  }

  private validateHealthData(props: SystemHealthProps): void {
    if (!props.id || props.id.trim() === '') {
      throw new Error('SystemHealth ID is required');
    }

    if (!props.executedAt) {
      throw new Error('Execution date is required');
    }

    if (props.ticketsFound < 0) {
      throw new Error('Tickets found count cannot be negative');
    }

    const validStatuses: SystemHealthStatus[] = ['success', 'error', 'partial'];
    if (!validStatuses.includes(props.status)) {
      throw new Error(
        `Invalid status: ${props.status}. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    if (props.executionDurationMs !== undefined && props.executionDurationMs < 0) {
      throw new Error('Execution duration cannot be negative');
    }

    if (props.createdAt && props.createdAt < props.executedAt) {
      throw new Error('Created date cannot be before execution date');
    }
  }

  toPlainObject(): SystemHealthProps {
    return { ...this.props };
  }
}
