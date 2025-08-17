#!/usr/bin/env -S deno run --allow-net --allow-sys --allow-run --allow-read

import { UrawaScrapingService } from '../src/infrastructure/services/UrawaScrapingService.ts';
import { ScrapedTicketData } from '../src/domain/entities/Ticket.ts';

/**
 * 浦和レッズアウェイチケット情報スクレイピング実行スクリプト
 * 実際のJ-Leagueチケットサイトからデータを取得して表示
 */
async function runScraping() {
  console.log('🔍 浦和レッズアウェイチケットスクレイピング開始');
  console.log('='.repeat(60));

  const scrapingService = new UrawaScrapingService();

  try {
    // 実際のスクレイピング実行
    const startTime = Date.now();
    console.log(`⏰ 開始時刻: ${new Date().toLocaleString('ja-JP')}`);

    const tickets = await scrapingService.scrapeUrawaAwayTickets();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n✅ スクレイピング完了');
    console.log(`⏱️  実行時間: ${duration}秒`);
    console.log('='.repeat(60));

    // 結果の表示
    if (tickets.length === 0) {
      console.log('ℹ️  現在販売中のアウェイチケットはありません');
    } else {
      console.log(`🎫 取得したアウェイチケット: ${tickets.length}件\n`);

      tickets.forEach((ticket, index) => {
        displayTicketDetails(ticket, index + 1);
      });

      // サマリー情報
      displaySummary(tickets);
    }
  } catch (error) {
    console.error('\n❌ スクレイピングエラー:');
    console.error(`エラー内容: ${error instanceof Error ? error.message : error}`);

    if (error instanceof Error && error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }

    // よくあるエラーパターンのヘルプ
    displayErrorHelp(error);

    Deno.exit(1);
  }
}

/**
 * チケット詳細情報を見やすく表示
 */
function displayTicketDetails(ticket: ScrapedTicketData, index: number) {
  console.log(`📋 【チケット ${index}】`);
  console.log(`   🏟️  試合: ${ticket.matchName}`);
  console.log(`   📅 試合日: ${ticket.matchDate}`);
  console.log(`   🎯 販売開始: ${ticket.saleDate}`);
  console.log(`   📍 会場: ${ticket.venue}`);
  console.log(`   🎫 チケット種別: ${ticket.ticketTypes.join(', ')}`);
  console.log(`   🔗 購入URL: ${ticket.ticketUrl}`);
  console.log('');
}

/**
 * スクレイピング結果のサマリー表示
 */
function displaySummary(tickets: ScrapedTicketData[]) {
  console.log('='.repeat(60));
  console.log('📊 サマリー情報');
  console.log('='.repeat(60));

  // 会場別集計
  const venueCount = new Map<string, number>();
  tickets.forEach((ticket) => {
    const count = venueCount.get(ticket.venue) || 0;
    venueCount.set(ticket.venue, count + 1);
  });

  console.log('🏟️  会場別チケット数:');
  venueCount.forEach((count, venue) => {
    console.log(`   ${venue}: ${count}件`);
  });

  // チケット種別の分析
  const allTicketTypes = tickets.flatMap((ticket) => ticket.ticketTypes);
  const uniqueTypes = [...new Set(allTicketTypes)];

  console.log('\n🎫 検出されたチケット種別:');
  uniqueTypes.forEach((type) => {
    console.log(`   - ${type}`);
  });

  // アウェイキーワードの検出状況
  console.log('\n🎯 アウェイキーワード検出:');
  const awayKeywords = ['アウェイ', 'ビジター', 'ミックス', 'away', 'visitor', 'mix'];
  awayKeywords.forEach((keyword) => {
    const matchingTickets = tickets.filter((ticket) =>
      ticket.ticketTypes.some((type) => type.toLowerCase().includes(keyword.toLowerCase())) ||
      ticket.matchName.toLowerCase().includes(keyword.toLowerCase())
    );
    if (matchingTickets.length > 0) {
      console.log(`   ${keyword}: ${matchingTickets.length}件`);
    }
  });
}

/**
 * エラー発生時のヘルプ表示
 */
function displayErrorHelp(error: unknown) {
  console.log('\n💡 トラブルシューティング:');

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('browser') || message.includes('playwright')) {
      console.log('  - Playwrightブラウザのインストールを確認してください');
      console.log('  - `deno run --allow-net --allow-run npm:playwright install chromium`');
    } else if (message.includes('network') || message.includes('fetch')) {
      console.log('  - インターネット接続を確認してください');
      console.log('  - J-Leagueチケットサイトがメンテナンス中の可能性があります');
    } else if (message.includes('selector') || message.includes('element')) {
      console.log('  - サイトの構造が変更された可能性があります');
      console.log('  - セレクター設定の更新が必要かもしれません');
    } else if (message.includes('timeout')) {
      console.log('  - タイムアウト設定を長めに調整してください');
      console.log('  - サイトの応答が遅い可能性があります');
    }
  }

  console.log('  - 詳細は CLAUDE.md の開発ノートを参照してください');
}

// メイン実行
if (import.meta.main) {
  await runScraping();
}
