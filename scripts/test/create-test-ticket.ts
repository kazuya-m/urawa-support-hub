#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

import { load } from '@std/dotenv';
import { createSupabaseAdminClient } from '@/config/supabase.ts';

await load({ export: true });

async function createTestTicket() {
  const client = createSupabaseAdminClient();

  const testTicketId = '1190b166-a55a-5f95-a92d-8cc1cebef1a9';

  const testTicketData = {
    id: testTicketId,
    match_name: '浦和レッズ vs FC東京',
    match_date: new Date('2025-03-15T19:00:00+09:00').toISOString(),
    home_team: '浦和レッズ',
    away_team: 'FC東京',
    venue: '味の素スタジアム',
    sale_start_date: new Date('2025-03-01T10:00:00+09:00').toISOString(),
    sale_end_date: new Date('2025-03-15T20:00:00+09:00').toISOString(),
    ticket_types: ['ビジター指定席', 'ビジター自由席'],
    ticket_url: 'https://www.jleague-ticket.jp/',
    scraped_at: new Date().toISOString(),
    sale_status: 'before_sale' as const,
    notification_scheduled: false,
  };

  const { error } = await client
    .from('tickets')
    .upsert(testTicketData);

  if (error) {
    console.error('❌ Error creating test ticket:', error);
  } else {
    console.log('✅ Test ticket created successfully');
    console.log(`🆔 Ticket ID: ${testTicketId}`);
    console.log(`🎫 Match: ${testTicketData.match_name}`);
    console.log(`📅 Match Date: ${testTicketData.match_date}`);
    console.log(`🎟️ Sale Start: ${testTicketData.sale_start_date}`);
  }
}

if (import.meta.main) {
  await createTestTicket();
}
