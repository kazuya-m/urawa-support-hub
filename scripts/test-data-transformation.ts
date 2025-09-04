#!/usr/bin/env -S deno run --allow-env

/**
 * データ変換・バリデーション処理のテストスクリプト
 * モックデータを使用してScrapedDataTransformerの動作を検証
 */

import { ScrapedDataTransformer } from '../src/infrastructure/services/scraping/transformation/ScrapedDataTransformer.ts';
import {
  invalidScrapedTicketData,
  mockScrapedTicketData,
  validScrapedTicketData,
} from '../src/__mocks__/scraped-ticket-data.ts';

console.log('🧪 データ変換・バリデーション処理テスト開始');
console.log('='.repeat(60));

async function testDataTransformation() {
  try {
    // 1. 全データを変換テスト
    console.log(`\n📋 全データ変換テスト (${mockScrapedTicketData.length}件)`);
    console.log('-'.repeat(40));

    const startTime = Date.now();
    const allResults = await ScrapedDataTransformer.transform(mockScrapedTicketData);
    const duration = Date.now() - startTime;

    console.log(`✅ 変換完了 (${duration}ms)`);
    console.log(`📊 結果: ${allResults.length} 件のTicketエンティティが作成されました`);

    if (allResults.length > 0) {
      console.log('\n📝 変換されたチケット一覧:');
      allResults.forEach((ticket, index) => {
        console.log(`  ${index + 1}. ${ticket.matchName} (${ticket.venue})`);
      });

      // JSONファイルに結果を出力
      const outputData = {
        timestamp: new Date().toISOString(),
        totalInput: mockScrapedTicketData.length,
        successfulConversions: allResults.length,
        tickets: allResults.map((ticket) => ({
          id: ticket.id,
          matchName: ticket.matchName,
          matchDate: ticket.matchDate.toISOString(),
          venue: ticket.venue,
          saleStartDate: ticket.saleStartDate.toISOString(),
          ticketUrl: ticket.ticketUrl,
          homeTeam: ticket.homeTeam,
          awayTeam: ticket.awayTeam,
          ticketTypes: ticket.ticketTypes,
          saleStatus: ticket.saleStatus,
        })),
      };

      await Deno.writeTextFile(
        './transformation-test-result.json',
        JSON.stringify(outputData, null, 2),
      );
      console.log('\n💾 変換結果をJSONで出力: ./transformation-test-result.json');
    }

    // 2. 有効データのみ変換テスト
    console.log(`\n📋 有効データ変換テスト (${validScrapedTicketData.length}件)`);
    console.log('-'.repeat(40));

    const validResults = await ScrapedDataTransformer.transform(validScrapedTicketData);
    console.log(`✅ 有効データ変換結果: ${validResults.length} 件`);

    // 3. 無効データのみ変換テスト
    console.log(`\n📋 無効データ変換テスト (${invalidScrapedTicketData.length}件)`);
    console.log('-'.repeat(40));

    const invalidResults = await ScrapedDataTransformer.transform(invalidScrapedTicketData);
    console.log(`❌ 無効データ変換結果: ${invalidResults.length} 件 (全て除外されるべき)`);

    // 4. 結果分析
    console.log('\n' + '='.repeat(60));
    console.log('📈 結果分析');
    console.log('='.repeat(60));

    console.log(`入力データ総数: ${mockScrapedTicketData.length} 件`);
    console.log(`  - 有効データ: ${validScrapedTicketData.length} 件`);
    console.log(`  - 無効データ: ${invalidScrapedTicketData.length} 件`);
    console.log(`変換成功数: ${allResults.length} 件`);
    console.log(
      `変換成功率: ${((allResults.length / mockScrapedTicketData.length) * 100).toFixed(1)}%`,
    );

    if (allResults.length === validScrapedTicketData.length) {
      console.log('\n✅ 期待通り: 有効データのみが変換されました');
    } else {
      console.log('\n⚠️  注意: 変換結果が期待と異なります');
      console.log(`   期待: ${validScrapedTicketData.length} 件`);
      console.log(`   実際: ${allResults.length} 件`);
    }
  } catch (error) {
    console.error('\n❌ テスト実行エラー:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nエラー詳細:');
      console.error('  メッセージ:', error.message);
      console.error('  スタック:', error.stack);
    }

    Deno.exit(1);
  }
}

// メイン実行
await testDataTransformation();

console.log('\n' + '='.repeat(60));
console.log('✨ テスト完了');
console.log('='.repeat(60));
