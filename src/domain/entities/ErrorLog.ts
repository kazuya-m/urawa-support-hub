export interface ErrorLog {
  id: string;
  functionName: string;
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  context?: string;
  createdAt: Date;
}

export interface SystemMetric {
  id: string;
  metricName: string;
  metricValue: number;
  metricTimestamp: Date;
  metadata?: Record<string, unknown>;
}
