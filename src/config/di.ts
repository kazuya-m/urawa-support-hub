/**
 * 依存性注入（DI）統一管理
 * 一般的なファクトリー関数パターンで実装
 */

import { load } from '@std/dotenv';

try {
  await load({ export: true });
} catch {
  // Ignore .env loading errors in production
}

import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { JLeagueScrapingService } from '@/infrastructure/scraping/jleague/JLeagueScrapingService.ts';
import { HiroshimaScrapingService } from '@/infrastructure/scraping/hiroshima/HiroshimaScrapingService.ts';
import { TestJLeagueScrapingService } from '@/infrastructure/scraping/test/TestJLeagueScrapingService.ts';
import { PlaywrightClient } from '@/infrastructure/clients/PlaywrightClient.ts';
import { BrowserManager } from '@/infrastructure/services/scraping/shared/BrowserManager.ts';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { getAppConfig } from '@/config/app-config.ts';

import { NotificationSchedulingService } from '@/domain/services/NotificationSchedulingService.ts';

import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { INotificationUseCase } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { INotificationBatchUseCase } from '@/application/interfaces/usecases/INotificationBatchUseCase.ts';
import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';

import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NotificationBatchUseCase } from '@/application/usecases/NotificationBatchUseCase.ts';
import { SendTicketSummaryUseCase } from '@/application/usecases/SendTicketSummaryUseCase.ts';

import { NotificationController } from '@/adapters/controllers/NotificationController.ts';
import { TicketCollectionController } from '@/adapters/controllers/TicketCollectionController.ts';
import { NotificationBatchController } from '@/adapters/controllers/NotificationBatchController.ts';
import { TicketSummaryController } from '@/adapters/controllers/TicketSummaryController.ts';

/**
 * 依存関係を作成するファクトリー関数
 * 実行時に設定を取得し、新しいインスタンスを作成
 */
export const createDependencies = () => {
  const config = getAppConfig();

  const supabaseClient = createSupabaseAdminClient();
  const cloudTasksClient = new CloudTasksClient(config.cloudTasks);
  const lineClient = new LineClient(config.line);

  const ticketRepository = new TicketRepository(supabaseClient);
  const notificationRepository = new NotificationRepository(supabaseClient);

  const notificationSchedulingService = new NotificationSchedulingService();

  // スクレイピングサービス設定（テストモード対応）
  const scrapingServices = [];

  if (TestJLeagueScrapingService.isTestModeEnabled()) {
    // テストモード: テスト用スクレイピングサービスを使用
    const testScrapingService = new TestJLeagueScrapingService();
    scrapingServices.push(testScrapingService);
  } else {
    // 本番モード: 実際のスクレイピングサービスを使用
    const playwrightClient = new PlaywrightClient();
    const browserManager = new BrowserManager(playwrightClient);

    // J-Leagueサイトスクレイピング
    const jleagueScrapingService = new JLeagueScrapingService(browserManager);
    scrapingServices.push(jleagueScrapingService);

    // サンフレッチェ広島公式サイトスクレイピング（同じbrowserManagerを使用）
    const hiroshimaScrapingService = new HiroshimaScrapingService(browserManager);
    scrapingServices.push(hiroshimaScrapingService);
  }

  const ticketCollectionService = new TicketCollectionService(scrapingServices);
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
    supabaseClient,
    cloudTasksClient,
    lineClient,
    ticketRepository,
    notificationRepository,
    ticketCollectionService,
    notificationSchedulerService,
    notificationService,
    notificationSchedulingService,
  };
};

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

export const createTicketSummaryUseCase = (): ITicketSummaryUseCase => {
  const deps = createDependencies();
  return new SendTicketSummaryUseCase(
    deps.ticketRepository,
    deps.lineClient,
  );
};

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

export const createTicketSummaryController = (): TicketSummaryController => {
  const ticketSummaryUseCase = createTicketSummaryUseCase();
  return new TicketSummaryController(
    ticketSummaryUseCase,
  );
};
