/**
 * 依存性注入（DI）統一管理
 * 一般的なファクトリー関数パターンで実装
 */

import { load } from '@std/dotenv';

try {
  await load({ export: true });
} catch {
  // .env file not found - ignore in production
}

import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { JLeagueScrapingService } from '@/infrastructure/scraping/jleague/JLeagueScrapingService.ts';
import { PlaywrightClient } from '@/infrastructure/clients/PlaywrightClient.ts';
import { BrowserManager } from '@/infrastructure/services/scraping/shared/BrowserManager.ts';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { getAppConfig } from '@/config/app-config.ts';

import { NotificationSchedulingService } from '@/domain/services/NotificationSchedulingService.ts';

import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { INotificationUseCase } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { INotificationBatchUseCase } from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';

import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NotificationBatchUseCase } from '@/application/usecases/NotificationBatchUseCase.ts';

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

  // Repositories
  const ticketRepository = new TicketRepository(supabaseClient);
  const notificationRepository = new NotificationRepository(supabaseClient);

  const notificationSchedulingService = new NotificationSchedulingService();

  // Infrastructure services
  const playwrightClient = new PlaywrightClient();
  const browserManager = new BrowserManager(playwrightClient);
  const jleagueScrapingService = new JLeagueScrapingService(browserManager);
  const ticketCollectionService = new TicketCollectionService([jleagueScrapingService]);
  const notificationSchedulerService = new NotificationSchedulerService(
    cloudTasksClient,
    notificationRepository,
  );
  const notificationService = new NotificationService(
    notificationRepository,
    ticketRepository,
    lineClient,
  );

  return {
    // Clients
    supabaseClient,
    cloudTasksClient,
    lineClient,
    // Repositories
    ticketRepository,
    notificationRepository,
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
