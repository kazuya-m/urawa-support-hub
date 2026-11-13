import type {
  NotificationExecutionInput,
  NotificationResult,
} from '@/application/usecases/results.ts';

export type { NotificationExecutionInput };

export interface INotificationUseCase {
  execute(input: NotificationExecutionInput): Promise<NotificationResult>;
}
