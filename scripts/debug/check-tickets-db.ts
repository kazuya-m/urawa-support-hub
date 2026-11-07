#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * データベース内のチケット情報を確認するデバッグスクリプト
 */

import { load } from '@std/dotenv';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { TicketConverter } from '@/infrastructure/repositories/converters/TicketConverter.ts';
import { throwDatabaseError } from '@/infrastructure/utils/database-error-handler.ts';
import { formatJST } from '@/shared/utils/datetime.ts';

try {
  await load({ export: true });
} catch {
}

async function checkTicketsInDB(): Promise<void> {
  console.log('🔍 Checking tickets in Supabase database...\n');

  try {
    const supabaseClient = createSupabaseAdminClient();

    // sale_status が NULL の行も含めて全件を表示する
    const { data, error } = await supabaseClient
      .from('tickets')
      .select('*')
      .order('match_date', { ascending: true });

    if (error) {
      throwDatabaseError('check-tickets-db', 'findAll', error, { table: 'tickets' });
    }

    const allTickets = (data ?? []).map(TicketConverter.toDomainEntity);

    console.log(`📊 Total tickets in database: ${allTickets.length}\n`);

    if (allTickets.length > 0) {
      console.log('🎫 Tickets found:');
      console.log('='.repeat(60));

      for (const [index, ticket] of allTickets.entries()) {
        console.log(`[${index + 1}] ${ticket.matchName}`);
        console.log(`    🆔 ID: ${ticket.id}`);
        console.log(`    📅 Match Date: ${formatJST(ticket.matchDate)}`);
        console.log(`    🏟️  Venue: ${ticket.venue}`);
        console.log(
          `    🎟️  Sale Start: ${
            ticket.saleStartDate ? formatJST(ticket.saleStartDate) : 'Not set'
          }`,
        );
        console.log(
          `    🚫 Sale End: ${ticket.saleEndDate ? formatJST(ticket.saleEndDate) : 'Not set'}`,
        );
        console.log(`    📈 Status: ${ticket.saleStatus}`);
        console.log(`    🔔 Notification Scheduled: ${ticket.notificationScheduled}`);
        console.log(`    🕒 Created: ${formatJST(ticket.createdAt)}`);
        console.log(`    🔄 Updated: ${formatJST(ticket.updatedAt)}`);
        console.log(`    🕷️  Scraped: ${formatJST(ticket.scrapedAt)}`);
        console.log(`    🔗 URL: ${ticket.ticketUrl}`);
        console.log(`    🎫 Types: ${ticket.ticketTypes.join(', ')}`);
        console.log('');
      }

      // 統計情報
      console.log('📈 Statistics:');
      console.log(`  Total tickets: ${allTickets.length}`);
      console.log(`  Sale Status breakdown:`);

      const statusCounts = allTickets.reduce((acc, ticket) => {
        if (ticket.saleStatus) {
          acc[ticket.saleStatus] = (acc[ticket.saleStatus] || 0) + 1;
        } else {
          acc['null'] = (acc['null'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    ${status}: ${count}`);
      });

      // 通知予定の確認
      const scheduledCount = allTickets.filter((t) => t.notificationScheduled).length;
      console.log(`  Notifications scheduled: ${scheduledCount}`);
    } else {
      console.log('❌ No tickets found in database');
      console.log('\n🔧 Possible reasons:');
      console.log('  1. Scraping failed (check server logs)');
      console.log('  2. Database connection issues');
      console.log('  3. No away matches found');
      console.log('  4. Data not committed properly');
    }
  } catch (error) {
    console.error('💥 Error checking database:', error);
    if (error instanceof Error) {
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    }
  }
}

if (import.meta.main) {
  checkTicketsInDB();
}
