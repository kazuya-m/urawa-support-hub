import { load } from '@std/dotenv';
import { type CollectTicketsDeps, createCollectTicketsDeps } from '@/usecases/collectTickets.ts';
import {
  createSendNotificationDeps,
  type SendNotificationDeps,
} from '@/usecases/sendNotification.ts';
import { createSendSummaryDeps, type SendSummaryDeps } from '@/usecases/sendSummary.ts';
import { handleHealthCheck } from '@/middleware/health.ts';
import { handleCollectTickets } from '@/entrypoints/service/collectTicketsController.ts';
import { handleSendNotification } from '@/entrypoints/service/sendNotificationController.ts';
import { handleSendSummary } from '@/entrypoints/service/sendSummaryController.ts';
import { handleRequest, routeKey, type Routes } from '@/entrypoints/service/router.ts';

interface RouteFactories {
  collectTickets: () => Promise<CollectTicketsDeps>;
  sendNotification: () => SendNotificationDeps;
  ticketSummary: () => SendSummaryDeps;
}

const routeFactories: RouteFactories = {
  collectTickets: createCollectTicketsDeps,
  sendNotification: createSendNotificationDeps,
  ticketSummary: createSendSummaryDeps,
};

const routes: Routes = {
  [routeKey('POST', '/api/collect-tickets')]: async () =>
    handleCollectTickets(await routeFactories.collectTickets()),
  [routeKey('POST', '/api/send-notification')]: (req) =>
    handleSendNotification(req, routeFactories.sendNotification()),
  [routeKey('POST', '/api/ticket-summary')]: () =>
    handleSendSummary(routeFactories.ticketSummary()),
  [routeKey('GET', '/health')]: () => handleHealthCheck(),
};

export function main(): void {
  const port = parseInt(Deno.env.get('PORT') || '8080');

  Deno.serve({
    port,
  }, (req) => handleRequest(req, routes));
}

if (import.meta.main) {
  await load({ export: true }).catch(() => ({}));
  main();
}
