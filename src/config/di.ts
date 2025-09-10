/**
 * 依存性注入（DI）統一管理
 * 一般的なファクトリー関数パターンで実装
 */

import { load } from '@std/dotenv';

// .envファイルを読み込み（テスト環境でも本番環境でも対応）
try {
  await load({ export: true });
} catch {
  // .envファイルが存在しない場合は無視（本番環境など）
}

// Infrastructure imports
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { HealthRepository } from '@/infrastructure/repositories/HealthRepository.ts';
import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { DiscordClient } from '@/infrastructure/clients/DiscordClient.ts';
import { JLeagueTicketScraper } from '@/infrastructure/services/scraping/sources/jleague/JLeagueTicketScraper.ts';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { getAppConfig } from '@/config/app-config.ts';

// Domain services
import { NotificationSchedulingService } from '@/domain/services/NotificationSchedulingService.ts';

// Interfaces
import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { INotificationUseCase } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { INotificationBatchUseCase } from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';

// Application
import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NotificationBatchUseCase } from '@/application/usecases/NotificationBatchUseCase.ts';

// Controllers
import { NotificationController } from '@/adapters/controllers/NotificationController.ts';
import { TicketCollectionController } from '@/adapters/controllers/TicketCollectionController.ts';
import { NotificationBatchController } from '@/adapters/controllers/NotificationBatchController.ts';

/**
 * 依存関係を作成するファクトリー関数
 * 実行時に設定を取得し、新しいインスタンスを作成
 */
export const createDependencies = () => {
  const config = getAppConfig();

  // Clients
  const supabaseClient = createSupabaseAdminClient();
  const cloudTasksClient = new CloudTasksClient(config.cloudTasks);
  const lineClient = new LineClient(config.line);
  const discordClient = new DiscordClient(config.discord);

  // Repositories
  const ticketRepository = new TicketRepository(supabaseClient);
  const notificationRepository = new NotificationRepository(supabaseClient);
  const healthRepository = new HealthRepository(supabaseClient);

  // Domain services
  const notificationSchedulingService = new NotificationSchedulingService();

  // Infrastructure services
  const jleagueScraper = new JLeagueTicketScraper();
  const ticketCollectionService = new TicketCollectionService(jleagueScraper);
  const notificationSchedulerService = new NotificationSchedulerService(
    cloudTasksClient,
    notificationRepository,
  );
  const notificationService = new NotificationService(
    notificationRepository,
    ticketRepository,
    lineClient,
    discordClient,
  );

  return {
    // Clients
    supabaseClient,
    cloudTasksClient,
    lineClient,
    discordClient,
    // Repositories
    ticketRepository,
    notificationRepository,
    healthRepository,
    // Services
    ticketCollectionService,
    notificationSchedulerService,
    notificationService,
    notificationSchedulingService,
  };
};

// UseCase作成関数
export const createTicketCollectionUseCase = (): ITicketCollectionUseCase => {
  const deps = createDependencies();
  return new TicketCollectionUseCase(
    deps.ticketCollectionService,
    deps.healthRepository,
    deps.ticketRepository,
    deps.notificationRepository,
    deps.notificationSchedulingService,
    deps.notificationSchedulerService,
  );
};

export const createNotificationUseCase = (): INotificationUseCase => {
  const deps = createDependencies();
  return new NotificationUseCase(
    deps.notificationService,
  );
};

export const createNotificationBatchUseCase = (): INotificationBatchUseCase => {
  const deps = createDependencies();
  return new NotificationBatchUseCase(
    deps.notificationService,
  );
};

// Controller作成関数
export const createNotificationController = (): NotificationController => {
  const notificationUseCase = createNotificationUseCase();
  return new NotificationController(
    notificationUseCase,
  );
};

export const createTicketCollectionController = (): TicketCollectionController => {
  const ticketCollectionUseCase = createTicketCollectionUseCase();
  return new TicketCollectionController(
    ticketCollectionUseCase,
  );
};

export const createNotificationBatchController = (): NotificationBatchController => {
  const notificationBatchUseCase = createNotificationBatchUseCase();
  return new NotificationBatchController(
    notificationBatchUseCase,
  );
};
