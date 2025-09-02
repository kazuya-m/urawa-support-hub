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

import { JLeagueTicketScraper } from '../src/infrastructure/services/scraping/sources/jleague/JLeagueTicketScraper.ts';
import { TicketCollectionService } from '../src/infrastructure/services/scraping/TicketCollectionService.ts';
import { ScrapedTicketData } from '../src/infrastructure/services/scraping/types/ScrapedTicketData.ts';

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
  // 統合収集サービスのテスト
  console.log('\n🔄 統合チケット収集サービステスト');
  const collectionService = new TicketCollectionService();

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

    // 詳細表示のため個別にJ-LeagueのScrapedDataを取得
    const jleagueScraper = new JLeagueTicketScraper();
    const tickets = await jleagueScraper.scrapeTickets();
    console.log('='.repeat(50));

    // チケット情報を詳細表示
    tickets.forEach((ticket: ScrapedTicketData, index: number) => {
      console.log(`\n【試合 ${index + 1}】`);
      console.log(`  対戦相手: ${ticket.matchName}`);
      console.log(`  試合日時: ${ticket.matchDate}`);
      console.log(`  会場: ${ticket.venue}`);
      console.log(`  販売日時: ${ticket.saleDate}`);
      console.log(`  チケット種別: ${ticket.ticketTypes.join(', ') || 'なし'}`);
      console.log(`  購入URL: ${ticket.ticketUrl}`);
    });

    // データ検証
    console.log('\n' + '='.repeat(50));
    console.log('📝 データ検証');
    console.log('='.repeat(50));

    let hasErrors = false;
    tickets.forEach((ticket: ScrapedTicketData, index: number) => {
      const errors: string[] = [];

      if (!ticket.matchName) errors.push('試合名が空');
      if (!ticket.matchDate) errors.push('試合日時が空');
      if (!ticket.venue) errors.push('会場が空');
      if (!ticket.saleDate) errors.push('販売日時が空');
      if (!ticket.ticketUrl) errors.push('購入URLが空');

      if (errors.length > 0) {
        hasErrors = true;
        console.log(`\n❌ 試合 ${index + 1} のエラー:`);
        errors.forEach((error) => console.log(`   - ${error}`));
      }
    });

    if (!hasErrors) {
      console.log('\n✅ すべてのデータが正常に取得されました');
    }

    // スクレイピング成功時にデバッグ用JSONを出力
    const debugOutput = {
      timestamp: new Date().toISOString(),
      ticketCount: tickets.length,
      tickets: tickets,
    };

    const debugFilePath = './scraping-test-result.json';
    await Deno.writeTextFile(debugFilePath, JSON.stringify(debugOutput, null, 2));
    console.log(`\n💾 デバッグ用JSONファイルを出力: ${debugFilePath}`);
  } catch (error) {
    console.error('\n❌ スクレイピングエラー:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nエラー詳細:');
      console.error('  メッセージ:', error.message);
      console.error('  スタック:', error.stack);
    }

    // エラー時にスクリーンショットを保存する機能を追加予定
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
