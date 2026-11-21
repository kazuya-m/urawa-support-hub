import { load } from '@std/dotenv';
import { type AppConfig, getAppConfig } from '@/config/app-config.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { handleHealthCheck } from '@/middleware/health.ts';
import type { SendNotificationDeps } from '@/usecases/sendNotification.ts';
import { createCollectTicketsDeps } from '@/entrypoints/job/collectTickets.ts';
import { createSendSummaryDeps } from '@/entrypoints/job/sendSummary.ts';
import { handleCollectTickets } from '@/entrypoints/service/collectTicketsController.ts';
import { handleSendNotification } from '@/entrypoints/service/sendNotificationController.ts';
import { handleSendSummary } from '@/entrypoints/service/sendSummaryController.ts';
import { handleRequest, routeKey, type Routes } from '@/entrypoints/service/router.ts';

function createSendNotificationDeps(config: AppConfig): SendNotificationDeps {
  const supabaseClient = getSupabaseAdminClient();
  return {
    ticketRepository: new TicketRepository(supabaseClient),
    notificationRepository: new NotificationRepository(supabaseClient),
    lineClient: new LineClient(config.line),
    now: () => new Date(),
  };
}

function createRoutes(config: AppConfig): Routes {
  return {
    [routeKey('POST', '/api/collect-tickets')]: () =>
      handleCollectTickets(createCollectTicketsDeps(config)),
    [routeKey('POST', '/api/send-notification')]: (req) =>
      handleSendNotification(req, createSendNotificationDeps(config)),
    [routeKey('POST', '/api/ticket-summary')]: () =>
      handleSendSummary(createSendSummaryDeps(config)),
    [routeKey('GET', '/health')]: () => handleHealthCheck(),
  };
}

if (import.meta.main) {
  await load({ export: true }).catch(() => ({}));
  const routes = createRoutes(getAppConfig());
  const port = parseInt(Deno.env.get('PORT') || '8080');

  Deno.serve({ port }, (req) => handleRequest(req, routes));
}
