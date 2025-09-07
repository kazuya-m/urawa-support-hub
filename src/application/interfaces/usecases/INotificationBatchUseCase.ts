import { BatchProcessingResult } from '@/application/types/UseCaseResults.ts';

export interface BatchExecutionInput {
  operation: 'process_pending' | 'cleanup_expired';
}

export interface INotificationBatchUseCase {
  execute(input: BatchExecutionInput): Promise<BatchProcessingResult>;
}
