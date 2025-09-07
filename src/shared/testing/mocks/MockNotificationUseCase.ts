import {
  INotificationUseCase,
  NotificationExecutionInput,
} from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { NotificationResult } from '@/application/types/UseCaseResults.ts';

export class MockNotificationUseCase implements INotificationUseCase {
  private mockResults: NotificationResult[] = [];
  private currentResultIndex = 0;
  private shouldThrowError = false;
  private errorMessage = 'Mock notification use case error';
  private executedInputs: NotificationExecutionInput[] = [];

  async execute(input: NotificationExecutionInput): Promise<NotificationResult> {
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
      ticketId: input.ticketId,
      notificationType: input.notificationType,
      executionDurationMs: 100,
    };
  }

  // Test utility methods
  setMockResults(results: NotificationResult[]): void {
    this.mockResults = results;
    this.currentResultIndex = 0;
  }

  setShouldThrowError(shouldThrow: boolean, message = 'Mock notification use case error'): void {
    this.shouldThrowError = shouldThrow;
    this.errorMessage = message;
  }

  getExecutedInputs(): NotificationExecutionInput[] {
    return [...this.executedInputs];
  }

  clear(): void {
    this.mockResults = [];
    this.currentResultIndex = 0;
    this.shouldThrowError = false;
    this.executedInputs = [];
  }
}
