/**
 * 依存性注入（DI）統一管理
 * アプリケーション全体の依存関係をここで管理
 */

// Infrastructure imports
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { HealthRepository } from '@/infrastructure/repositories/HealthRepository.ts';
import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import { CloudTasksClient, CloudTasksConfig } from '@/infrastructure/clients/CloudTasksClient.ts';
import { JLeagueTicketScraper } from '@/infrastructure/services/scraping/sources/jleague/JLeagueTicketScraper.ts';
import { createSupabaseAdminClient } from '@/config/supabase.ts';

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

// シングルトン依存関係（1度だけ作成）
const dependencies = (() => {
  if (Deno.env.get('DENO_ENV') !== 'production') {
    console.log('🔧 Initializing dependencies...');
  }

  // Clients
  const supabaseClient = createSupabaseAdminClient();
  const cloudTasksConfig: CloudTasksConfig = {
    projectId: Deno.env.get('GOOGLE_CLOUD_PROJECT') || Deno.env.get('GCP_PROJECT_ID') || '',
    location: Deno.env.get('CLOUD_TASKS_LOCATION') || Deno.env.get('GCP_REGION') ||
      'asia-northeast1',
    queueName: 'notifications',
    enableDebugLogs: Deno.env.get('CLOUD_TASKS_DEBUG') === 'true',
    denoEnv: Deno.env.get('DENO_ENV') || 'development',
  };
  const cloudTasksClient = new CloudTasksClient(cloudTasksConfig);

  // Repositories（シングルトン）
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
  );

  return {
    // Clients
    supabaseClient,
    cloudTasksClient,
    // Repositories
    ticketRepository,
    notificationRepository,
    healthRepository,
    // Services
    ticketCollectionService,
    notificationSchedulerService,
    notificationService,
    notificationSchedulingService,
    // Scrapers
    jleagueScraper,
  };
})(); // 即座に実行してシングルトンを作成

// UseCase作成関数
export const createTicketCollectionUseCase = (): ITicketCollectionUseCase => {
  return new TicketCollectionUseCase(
    dependencies.ticketCollectionService,
    dependencies.healthRepository,
    dependencies.ticketRepository,
    dependencies.notificationRepository,
    dependencies.notificationSchedulingService,
    dependencies.notificationSchedulerService,
  );
};

export const createNotificationUseCase = (): INotificationUseCase => {
  return new NotificationUseCase(
    dependencies.notificationService,
  );
};

export const createNotificationBatchUseCase = (): INotificationBatchUseCase => {
  return new NotificationBatchUseCase(
    dependencies.notificationService,
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
