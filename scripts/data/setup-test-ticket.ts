#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

/**
 * テストチケットデータ作成・削除スクリプト
 *
 * 使用方法:
 * - テストチケット作成: deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create
 * - 通知テスト用データ作成: deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create-notification-test
 * - 全データ削除: deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup
 * - 特定チケット削除: deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup <ticket-id>
 * - 全データ削除: deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup-all
 */

import { load } from '@std/dotenv';
import { createSupabaseAdminClient } from '@/config/supabase.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';

await load({ export: true });

const operation = Deno.args[0];
const ticketId = Deno.args[1];

if (
  !operation ||
  !['create', 'create-notification-test', 'cleanup', 'cleanup-all'].includes(operation)
) {
  console.error(`
使用方法:
  create                  - 単一のテストチケットを作成
  create-notification-test - 通知テスト用の複数チケットを作成
  cleanup                 - 全てのデータを削除（引数なし）
  cleanup <id>           - 指定IDのデータを削除
  cleanup-all            - 全てのデータを削除

例:
  deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create
  deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create-notification-test
  deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup
  deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup ticket-id-here
  deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup-all
`);
  Deno.exit(1);
}

async function createTestTicket(): Promise<string> {
  const supabaseClient = createSupabaseAdminClient();
  const ticketRepository = new TicketRepository(supabaseClient);

  const testTicket = await Ticket.createNew({
    matchName: '【テスト】浦和レッズ vs FC東京',
    matchDate: new Date('2024-03-15T19:00:00+09:00'),
    homeTeam: '浦和レッズ',
    awayTeam: 'FC東京',
    competition: null,
    venue: '味の素スタジアム',
    saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
    saleEndDate: null,
    ticketTypes: null,
    ticketUrl: 'https://www.jleague-ticket.jp/',
    saleStatus: 'on_sale',
    scrapedAt: new Date(),
  });

  const savedTicket = await ticketRepository.upsert(testTicket);
  console.log(`✅ テストチケット作成完了: ${savedTicket.matchName} (ID: ${savedTicket.id})`);
  return savedTicket.id;
}

/**
 * 通知テスト用の複数チケットを作成
 */
async function createNotificationTestTickets(): Promise<string[]> {
  const supabaseClient = createSupabaseAdminClient();
  const ticketRepository = new TicketRepository(supabaseClient);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const testTickets = [
    // スケジュール通知テスト用: 明日の試合
    await Ticket.createNew({
      matchName: '【通知テスト】浦和レッズ vs FC東京',
      matchDate: tomorrow,
      homeTeam: '浦和レッズ',
      awayTeam: 'FC東京',
      competition: null,
      venue: '埼玉スタジアム2002',
      saleStartDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2時間後に販売開始
      saleEndDate: null,
      ticketTypes: null,
      ticketUrl: 'https://www.jleague-ticket.jp/test-1',
      saleStatus: 'before_sale',
      scrapedAt: new Date(),
    }),

    // サマリー通知テスト用: 来週の試合（販売中）
    await Ticket.createNew({
      matchName: '【サマリーテスト】浦和レッズ vs 横浜F・マリノス',
      matchDate: nextWeek,
      homeTeam: '浦和レッズ',
      awayTeam: '横浜F・マリノス',
      competition: null,
      venue: '埼玉スタジアム2002',
      saleStartDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 昨日から販売開始
      saleEndDate: null,
      ticketTypes: null,
      ticketUrl: 'https://www.jleague-ticket.jp/test-2',
      saleStatus: 'on_sale',
      scrapedAt: new Date(),
    }),

    // サマリー通知テスト用: 来月の試合（販売中）
    await Ticket.createNew({
      matchName: '【サマリーテスト】浦和レッズ vs セレッソ大阪',
      matchDate: nextMonth,
      homeTeam: '浦和レッズ',
      awayTeam: 'セレッソ大阪',
      competition: null,
      venue: '埼玉スタジアム2002',
      saleStartDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3日前から販売開始
      saleEndDate: null,
      ticketTypes: null,
      ticketUrl: 'https://www.jleague-ticket.jp/test-3',
      saleStatus: 'on_sale',
      scrapedAt: new Date(),
    }),
  ];

  const savedTickets: string[] = [];

  console.log('🎫 通知テスト用チケットデータを作成中...');
  for (const ticket of testTickets) {
    const savedTicket = await ticketRepository.upsert(ticket);
    savedTickets.push(savedTicket.id);
    console.log(`✅ 作成完了: ${savedTicket.matchName} (ID: ${savedTicket.id})`);
  }

  return savedTickets;
}

/**
 * 指定されたチケットIDのテストデータを削除
 */
async function cleanupTestData(ticketId: string): Promise<void> {
  const supabaseClient = createSupabaseAdminClient();
  const notificationRepository = new NotificationRepository(supabaseClient);

  // 関連する通知データを削除
  const notifications = await notificationRepository.findByTicketId(ticketId);
  for (const notification of notifications) {
    await supabaseClient.from('notifications').delete().eq('id', notification.id);
  }

  // チケットデータを削除
  await supabaseClient.from('tickets').delete().eq('id', ticketId);
  console.log(`🗑️ 削除完了: チケットID ${ticketId}`);
}

/**
 * 全てのチケットデータを削除
 */
async function cleanupAllTestData(): Promise<void> {
  const supabaseClient = createSupabaseAdminClient();

  // 全てのチケットを検索
  const { data: allTickets } = await supabaseClient
    .from('tickets')
    .select('id, match_name');

  if (!allTickets || allTickets.length === 0) {
    console.log('🔍 削除対象のデータが見つかりませんでした');
    return;
  }

  console.log(`🔍 ${allTickets.length}件の全データを削除します:`);
  for (const ticket of allTickets) {
    console.log(`  - ${ticket.match_name} (ID: ${ticket.id})`);
  }

  // 関連する通知データを削除
  for (const ticket of allTickets) {
    await supabaseClient.from('notifications').delete().eq('ticket_id', ticket.id);
  }

  // 全てのチケットを削除
  for (const ticket of allTickets) {
    await supabaseClient.from('tickets').delete().eq('id', ticket.id);
  }

  console.log('🗑️ 全てのデータを削除しました');
}

// メイン処理
try {
  if (operation === 'create') {
    const ticketId = await createTestTicket();
    console.log('\n💡 スケジュール通知テスト用コマンド:');
    console.log(
      `  deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts ${ticketId}`,
    );
  } else if (operation === 'create-notification-test') {
    const ticketIds = await createNotificationTestTickets();
    console.log('\n📋 作成されたチケットID一覧:');
    ticketIds.forEach((id) => console.log(`  ${id}`));
    console.log('\n💡 スケジュール通知テスト用コマンド:');
    console.log(
      `  deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts ${
        ticketIds[0]
      }`,
    );
    console.log('\n💡 サマリー通知テスト用コマンド:');
    console.log(
      `  deno run --allow-env --allow-net --allow-read scripts/demo/test-ticket-summary.ts`,
    );
  } else if (operation === 'cleanup') {
    if (!ticketId) {
      console.log('🗑️ 引数なしの場合は全データを削除します');
      await cleanupAllTestData();
    } else {
      await cleanupTestData(ticketId);
    }
  } else if (operation === 'cleanup-all') {
    await cleanupAllTestData();
  }
} catch (error) {
  console.error('❌ エラーが発生しました:', error);
  Deno.exit(1);
}
