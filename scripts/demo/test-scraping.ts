#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write

/**
 * 手動実行用スクレイピングテストスクリプト
 * 実際のJ-Leagueチケットサイトにアクセスしてテストを行う
 *
 * 使用方法:
 * deno run --allow-env --allow-net --allow-read --allow-write scripts/test-scraping.ts
 *
 * 注意: アクセス過多を防ぐため、手動実行のみ推奨
 */

import { TicketCollectionService } from '../../src/infrastructure/services/scraping/TicketCollectionService.ts';
import { JLeagueScrapingService } from '../../src/infrastructure/services/scraping/sources/jleague/JLeagueScrapingService.ts';
import { PlaywrightClient } from '../../src/infrastructure/clients/PlaywrightClient.ts';
import { BrowserManager } from '../../src/infrastructure/services/scraping/shared/BrowserManager.ts';
import { Ticket } from '../../src/domain/entities/Ticket.ts';
import { formatJST } from '../../src/shared/utils/datetime.ts';

// 環境変数チェック
const isLiveScrapingEnabled = Deno.env.get('ENABLE_LIVE_SCRAPING') === 'true';

if (!isLiveScrapingEnabled) {
  console.warn('⚠️  実サイトへのスクレイピングは無効です');
  console.warn('実行するには環境変数を設定してください:');
  console.warn(
    'ENABLE_LIVE_SCRAPING=true deno run --allow-env --allow-net --allow-read --allow-write scripts/test-scraping.ts',
  );
  Deno.exit(1);
}

console.log('🚀 スクレイピングテスト開始');
console.log('='.repeat(50));

async function testScraping() {
  console.log('\n🔄 統合チケット収集サービステスト');
  // 新アーキテクチャ：PlaywrightClient → BrowserManager → JLeagueScrapingService
  const playwrightClient = new PlaywrightClient();
  const browserManager = new BrowserManager(playwrightClient);
  const jleagueScraper = new JLeagueScrapingService(browserManager);
  const collectionService = new TicketCollectionService([jleagueScraper]);

  try {
    console.log('\n📋 浦和レッズアウェイチケット情報を取得中...');
    const startTime = Date.now();

    // 統合サービスでテスト
    const result = await collectionService.collectAllTickets();

    const duration = Date.now() - startTime;
    console.log(`\n✅ 取得完了 (${duration}ms)`);
    console.log('='.repeat(50));
    console.log(`\n📊 取得結果: ${result.length} 件のアウェイチケット`);

    if (result.length === 0) {
      console.log('⚠️  アウェイチケットが見つかりませんでした');
      return;
    }

    // チケット情報を詳細表示
    result.forEach((ticket: Ticket, index: number) => {
      console.log(`\n【試合 ${index + 1}】`);
      console.log(`  対戦相手: ${ticket.matchName}`);
      console.log(`  試合日時: ${formatJST(ticket.matchDate, 'yyyy/MM/dd')}`);
      console.log(`  会場: ${ticket.venue}`);
      console.log(`  販売開始: ${ticket.saleStartDate ? formatJST(ticket.saleStartDate) : '未定'}`);
      console.log(`  購入URL: ${ticket.ticketUrl}`);
    });

    // 統合サービス結果をJSONで出力（Ticketの全プロパティ）
    const debugOutput = {
      timestamp: new Date().toISOString(),
      ticketCount: result.length,
      tickets: result.map((ticket: Ticket) => ({
        id: ticket.id,
        matchName: ticket.matchName,
        matchDate: ticket.matchDate.toISOString(),
        homeTeam: ticket.homeTeam,
        awayTeam: ticket.awayTeam,
        saleStartDate: ticket.saleStartDate?.toISOString() || null,
        saleEndDate: ticket.saleEndDate?.toISOString() || null,
        venue: ticket.venue,
        ticketTypes: ticket.ticketTypes,
        ticketUrl: ticket.ticketUrl,
        saleStatus: ticket.saleStatus,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        scrapedAt: ticket.scrapedAt.toISOString(),
      })),
    };

    const debugFilePath = './scraping-test-result.json';
    await Deno.writeTextFile(debugFilePath, JSON.stringify(debugOutput, null, 2));
    console.log(`\n💾 統合サービス結果をJSONで出力: ${debugFilePath}`);

    console.log('\n✅ すべてのデータが正常に取得されました');
  } catch (error) {
    console.error('\n❌ スクレイピングエラー:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nエラー詳細:');
      console.error('  メッセージ:', error.message);
      console.error('  スタック:', error.stack);
    }

    console.log('\n💡 ヒント: ブラウザが正しくインストールされているか確認してください');
    console.log('  npx playwright install chromium');

    Deno.exit(1);
  }
}

// メイン実行
console.log('\n⚠️  注意: このスクリプトは実際のサイトにアクセスします');
console.log('アクセス過多を防ぐため、頻繁な実行は避けてください\n');

await testScraping();

console.log('\n' + '='.repeat(50));
console.log('✨ テスト完了');
