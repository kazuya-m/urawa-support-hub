import { load } from '@std/dotenv';
import { type AppConfig, getAppConfig } from '@/config/app-config.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
import { PlaywrightClient } from '@/infrastructure/clients/PlaywrightClient.ts';
import { CloudTasksClient } from '@/infrastructure/clients/CloudTasksClient.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationSchedulerService } from '@/infrastructure/services/notification/NotificationSchedulerService.ts';
import { TicketCollectionService } from '@/infrastructure/services/scraping/TicketCollectionService.ts';
import { BrowserManager } from '@/infrastructure/services/scraping/shared/BrowserManager.ts';
import { JLeagueScrapingService } from '@/infrastructure/services/scraping/sources/jleague/JLeagueScrapingService.ts';
import { HiroshimaScrapingService } from '@/infrastructure/services/scraping/sources/hiroshima/HiroshimaScrapingService.ts';
import { collectTickets, type CollectTicketsDeps } from '@/usecases/collectTickets.ts';
import { runJob } from './runJob.ts';

export function createCollectTicketsDeps(config: AppConfig): CollectTicketsDeps {
  const supabaseClient = getSupabaseAdminClient();
  const cloudTasksClient = new CloudTasksClient(config.cloudTasks);

  // スクレイピングサービス間でブラウザを共有すると並行実行で競合するため、サイトごとに分ける
  const scrapingServices = [
    new JLeagueScrapingService(new BrowserManager(new PlaywrightClient())),
    new HiroshimaScrapingService(new BrowserManager(new PlaywrightClient())),
  ];

  return {
    ticketCollectionService: new TicketCollectionService(scrapingServices),
    ticketRepository: new TicketRepository(supabaseClient),
    notificationSchedulerService: new NotificationSchedulerService(
      cloudTasksClient,
      config.notificationUrl,
    ),
    now: () => new Date(),
  };
}

if (import.meta.main) {
  await load({ export: true }).catch(() => ({}));
  const config = getAppConfig();
  Deno.exit(
    await runJob(
      { name: 'collect-tickets', ...config.cloudRunJob },
      () => collectTickets(createCollectTicketsDeps(config)),
    ),
  );
}
