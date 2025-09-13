// UseCase interfaces
export type { ITicketCollectionUseCase } from './usecases/ITicketCollectionUseCase.ts';
export type {
  INotificationUseCase,
  NotificationExecutionInput,
} from './usecases/INotificationUseCase.ts';
export type {
  BatchExecutionInput,
  INotificationBatchUseCase,
} from './usecases/INotificationBatchUseCase.ts';

// Repository interfaces
export type { ITicketRepository } from './repositories/ITicketRepository.ts';
export type { INotificationRepository } from './repositories/INotificationRepository.ts';

// Service interfaces
export type { ITicketCollectionService } from './services/ITicketCollectionService.ts';
export type { INotificationSchedulerService } from './services/INotificationSchedulerService.ts';
export type { INotificationService } from './services/INotificationService.ts';
