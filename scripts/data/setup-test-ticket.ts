#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { load } from '@std/dotenv';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';

await load({ export: true });

const operation = Deno.args[0];
const ticketId = Deno.args[1];

if (!operation || !['create', 'cleanup'].includes(operation)) {
  console.error('Usage: create | cleanup <ticket-id>');
  Deno.exit(1);
}

async function createTestTicket(): Promise<string> {
  const supabaseClient = createSupabaseAdminClient();
  const ticketRepository = new TicketRepository(supabaseClient);

  const testTicket = await Ticket.createNew({
    matchName: '【テスト】浦和レッズ vs FC東京',
    matchDate: new Date('2024-03-15T19:00:00+09:00'),
    venue: '味の素スタジアム',
    saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
    ticketUrl: 'https://www.jleague-ticket.jp/',
    saleStatus: 'on_sale',
    scrapedAt: new Date(),
  });

  const savedTicket = await ticketRepository.upsert(testTicket);
  console.log(`Ticket ID: ${savedTicket.id}`);
  return savedTicket.id;
}

async function cleanupTestData(ticketId?: string): Promise<void> {
  const supabaseClient = createSupabaseAdminClient();

  if (ticketId) {
    // Cleanup specific ticket
    const notificationRepository = new NotificationRepository(supabaseClient);
    const notifications = await notificationRepository.findByTicketId(ticketId);
    for (const notification of notifications) {
      await supabaseClient.from('notifications').delete().eq('id', notification.id);
    }
    await supabaseClient.from('tickets').delete().eq('id', ticketId);
    console.log(`Cleanup completed for ticket ID: ${ticketId}`);
  } else {
    // Cleanup all test data
    await supabaseClient.from('notifications').delete().neq('id', '');
    await supabaseClient.from('tickets').delete().neq('id', '');
    console.log('Cleanup completed for all test data');
  }
}

if (operation === 'create') {
  const ticketId = await createTestTicket();
} else if (operation === 'cleanup') {
  await cleanupTestData(ticketId);
}
