import {
  createNotificationController,
  createTicketCollectionController,
  createTicketSummaryController,
} from '@/config/di.ts';
import { handleHealthCheck } from '@/middleware/health.ts';

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/api/collect-tickets' && req.method === 'POST') {
    const ticketController = createTicketCollectionController();
    return await ticketController.handleCollectTickets(req);
  }

  if (url.pathname === '/api/send-notification' && req.method === 'POST') {
    const notificationController = createNotificationController();
    return await notificationController.handleSendNotification(req);
  }

  if (url.pathname === '/api/ticket-summary' && req.method === 'POST') {
    const ticketSummaryController = createTicketSummaryController();
    return await ticketSummaryController.handleTicketSummary(req);
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    return handleHealthCheck();
  }

  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: `${req.method} ${url.pathname} is not supported`,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function main(): void {
  const port = parseInt(Deno.env.get('PORT') || '8080');

  Deno.serve({
    port,
  }, handleRequest);
}

if (import.meta.main) {
  main();
}
