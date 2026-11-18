/**
 * 依存性注入（DI）統一管理
 * 一般的なファクトリー関数パターンで実装
 */

import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';
import { JLeagueScrapingService } from '@/infrastructure/services/scraping/sources/jleague/JLeagueScrapingService.ts';
import { HiroshimaScrapingService } from '@/infrastructure/services/scraping/sources/hiroshima/HiroshimaScrapingService.ts';
import { PlaywrightClient } from '@/infrastructure/clients/PlaywrightClient.ts';
import { BrowserManager } from '@/infrastructure/services/scraping/shared/BrowserManager.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
import { getAppConfig } from '@/config/app-config.ts';

import { NotificationSchedulingService } from '@/domain/services/NotificationSchedulingService.ts';

import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';

import { TicketCollectionController } from '@/adapters/controllers/TicketCollectionController.ts';

/**
 * 依存関係を作成するファクトリー関数
 * 実行時に設定を取得し、新しいインスタンスを作成
 */
export const createDependencies = () => {
  const config = getAppConfig();

  const supabaseClient = getSupabaseAdminClient();
  const cloudTasksClient = new CloudTasksClient(config.cloudTasks);

  const ticketRepository = new TicketRepository(supabaseClient);
  const notificationRepository = new NotificationRepository(supabaseClient);

  const notificationSchedulingService = new NotificationSchedulingService();

  // スクレイピングサービス設定
  const scrapingServices = [];

  const jleagueBrowserManager = new BrowserManager(new PlaywrightClient());
  const jleagueScrapingService = new JLeagueScrapingService(jleagueBrowserManager);
  scrapingServices.push(jleagueScrapingService);

  const hiroshimaBrowserManager = new BrowserManager(new PlaywrightClient());
  const hiroshimaScrapingService = new HiroshimaScrapingService(hiroshimaBrowserManager);
  scrapingServices.push(hiroshimaScrapingService);

  const ticketCollectionService = new TicketCollectionService(scrapingServices);
  const notificationSchedulerService = new NotificationSchedulerService(
    cloudTasksClient,
    notificationRepository,
  );

  return {
    supabaseClient,
    cloudTasksClient,
    ticketRepository,
    notificationRepository,
    ticketCollectionService,
    notificationSchedulerService,
    notificationSchedulingService,
  };
};

export const createTicketCollectionUseCase = (): TicketCollectionUseCase => {
  const deps = createDependencies();
  return new TicketCollectionUseCase(
    deps.ticketCollectionService,
    deps.ticketRepository,
    deps.notificationRepository,
    deps.notificationSchedulingService,
    deps.notificationSchedulerService,
  );
};

export const createTicketCollectionController = (): TicketCollectionController => {
  const ticketCollectionUseCase = createTicketCollectionUseCase();
  return new TicketCollectionController(
    ticketCollectionUseCase,
  );
};
