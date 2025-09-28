// Mock実装のエクスポート
export { MockTicketRepository } from './MockTicketRepository.ts';
export { MockNotificationRepository } from './MockNotificationRepository.ts';
export { MockTicketCollectionService } from './MockTicketCollectionService.ts';
export { MockNotificationSchedulerService } from './MockNotificationSchedulerService.ts';
export { MockCloudTasksClient } from './MockCloudTasksClient.ts';
export { MockNotificationService } from './MockNotificationService.ts';
export { MockNotificationUseCase } from './MockNotificationUseCase.ts';
export { MockTicketScraper } from './MockTicketScraper.ts';
export { MockLineClient } from './MockLineClient.ts';

// テスト用依存関係生成ヘルパー
import { MockTicketRepository } from './MockTicketRepository.ts';
import { MockNotificationRepository } from './MockNotificationRepository.ts';
import { MockTicketCollectionService } from './MockTicketCollectionService.ts';
import { MockNotificationSchedulerService } from './MockNotificationSchedulerService.ts';
import { NotificationSchedulingService } from '@/domain/services/NotificationSchedulingService.ts';
import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import type {
  INotificationRepository,
  INotificationSchedulerService,
  ITicketCollectionService,
  ITicketRepository,
} from '@/application/interfaces/index.ts';

// Test-specific dependency type
export type TestDependencies = {
  ticketCollectionService: ITicketCollectionService;
  ticketRepository: ITicketRepository;
  notificationRepository: INotificationRepository;
  notificationSchedulingService: NotificationSchedulingService;
  notificationSchedulerService: INotificationSchedulerService;
};

/**
 * 完全なMock依存関係を作成
 * 外部依存（DB、Playwright、Cloud Tasks）を全て排除
 */
export const createMockDependencies = (
  overrides: Partial<TestDependencies> = {},
): TestDependencies => {
  const mockTicketRepository = new MockTicketRepository();
  const mockNotificationRepository = new MockNotificationRepository();
  const mockTicketCollectionService = new MockTicketCollectionService();
  const mockNotificationSchedulerService = new MockNotificationSchedulerService();
  const notificationSchedulingService = new NotificationSchedulingService();

  return {
    ticketCollectionService: overrides.ticketCollectionService || mockTicketCollectionService,
    ticketRepository: overrides.ticketRepository || mockTicketRepository,
    notificationRepository: overrides.notificationRepository || mockNotificationRepository,
    notificationSchedulingService: overrides.notificationSchedulingService ||
      notificationSchedulingService,
    notificationSchedulerService: overrides.notificationSchedulerService ||
      mockNotificationSchedulerService,
  };
};

/**
 * 完全にMock化されたTicketCollectionUseCaseを作成
 * 外部依存なし、高速テスト実行可能
 */
export const createMockTicketCollectionUseCase = (
  dependencyOverrides: Partial<TestDependencies> = {},
): TicketCollectionUseCase => {
  const dependencies = createMockDependencies(dependencyOverrides);

  // DIファイルのcreateTicketCollectionUseCaseWithDepsを使わず、直接UseCaseを作成
  return new TicketCollectionUseCase(
    dependencies.ticketCollectionService,
    dependencies.ticketRepository,
    dependencies.notificationRepository,
    dependencies.notificationSchedulingService,
    dependencies.notificationSchedulerService,
  );
};

/**
 * 全Mockをクリアする便利関数
 */
export const clearAllMocks = (dependencies: ReturnType<typeof createMockDependencies>): void => {
  if (dependencies.ticketRepository instanceof MockTicketRepository) {
    dependencies.ticketRepository.clear();
  }
  if (dependencies.notificationRepository instanceof MockNotificationRepository) {
    dependencies.notificationRepository.clear();
  }
  if (dependencies.ticketCollectionService instanceof MockTicketCollectionService) {
    dependencies.ticketCollectionService.clear();
  }
  if (dependencies.notificationSchedulerService instanceof MockNotificationSchedulerService) {
    dependencies.notificationSchedulerService.clear();
  }
};
