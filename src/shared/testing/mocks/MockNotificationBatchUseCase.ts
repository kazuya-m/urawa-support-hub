import {
  BatchExecutionInput,
  INotificationBatchUseCase,
} from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';
import { BatchProcessingResult } from '@/application/types/UseCaseResults.ts';

export class MockNotificationBatchUseCase implements INotificationBatchUseCase {
  private mockResults: BatchProcessingResult[] = [];
  private currentResultIndex = 0;
  private shouldThrowError = false;
  private errorMessage = 'Mock batch use case error';
  private executedInputs: BatchExecutionInput[] = [];

  async execute(input: BatchExecutionInput): Promise<BatchProcessingResult> {
    if (this.shouldThrowError) {
      throw new Error(this.errorMessage);
    }

    this.executedInputs.push(input);

    if (this.mockResults.length > 0) {
      const result = this.mockResults[this.currentResultIndex % this.mockResults.length];
      this.currentResultIndex++;
      await Promise.resolve();
      return result;
    }

    await Promise.resolve();
    return {
      status: 'success',
      operation: input.operation,
      processed: input.operation === 'process_pending' ? 1 : undefined,
      failed: input.operation === 'process_pending' ? 0 : undefined,
      cleaned: input.operation === 'cleanup_expired' ? 0 : undefined,
      executionDurationMs: 100,
    };
  }

  // Test utility methods
  setMockResults(results: BatchProcessingResult[]): void {
    this.mockResults = results;
    this.currentResultIndex = 0;
  }

  setShouldThrowError(shouldThrow: boolean, message = 'Mock batch use case error'): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  getExecutedInputs(): BatchExecutionInput[] {
    return [...this.executedInputs];
  }

  clear(): void {
    this.mockResults = [];
    this.currentResultIndex = 0;
    this.shouldThrowError = false;
    this.executedInputs = [];
  }
}
