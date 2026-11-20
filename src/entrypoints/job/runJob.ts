import type { CloudRunJobConfig } from '@/config/app-config.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { toErrorInfo } from '@/shared/utils/errorUtils.ts';

export interface JobRun extends CloudRunJobConfig {
  name: string;
}

export async function runJob(run: JobRun, execute: () => Promise<unknown>): Promise<number> {
  const startTime = Date.now();
  const metadata = () => ({
    jobName: run.name,
    executionId: run.executionId,
    taskAttempt: run.taskAttempt,
    processingTimeMs: Date.now() - startTime,
  });

  try {
    await execute();
    CloudLogger.info(`Job ${run.name} completed`, {
      category: LogCategory.SYSTEM,
      metadata: metadata(),
    });
    return 0;
  } catch (error) {
    CloudLogger.error(`Job ${run.name} failed`, {
      category: LogCategory.SYSTEM,
      metadata: metadata(),
      error: toErrorInfo(error, undefined, false),
    });
    return 1;
  }
}
