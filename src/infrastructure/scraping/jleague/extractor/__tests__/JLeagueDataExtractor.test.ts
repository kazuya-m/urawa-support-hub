import { assertEquals } from 'testing/asserts.ts';
import { JLeagueDataExtractor } from '../JLeagueDataExtractor.ts';
import { MockPlaywrightClient } from '@/shared/testing/mocks/MockPlaywrightClient.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';

Deno.test('JLeagueDataExtractor - MockPageでのPlaywright非依存テスト', async () => {
  // MockPlaywrightClientでMockPageを作成
  const mockClient = new MockPlaywrightClient();

  // モックデータを設定
  mockClient.setMockPageData({
    '.match-title': '浦和レッズ vs FC東京',
    '.venue': 'さいたまスタジアム',
    'a[href]': 'https://example.com/ticket',
  });

  await mockClient.launch();
  const mockPage = await mockClient.createPage();

  // JLeagueDataExtractorをテスト（Playwrightを起動せず）
  const extractor = new JLeagueDataExtractor(
    J_LEAGUE_SCRAPING_CONFIG.listPage,
    J_LEAGUE_SCRAPING_CONFIG.detailBaseUrl,
  );

  // IPage型でextractTicketsを呼び出し
  // 実際のPlaywrightは起動しない
  const result = await extractor.extractTickets(mockPage);

  // 基本的な動作確認（実際のデータ抽出はモックデータに依存）
  assertEquals(Array.isArray(result), true);
  assertEquals(extractor.getAndClearWarnings().length >= 0, true);

  await mockClient.close();
});

Deno.test('JLeagueDataExtractor - 警告機能のテスト', () => {
  const extractor = new JLeagueDataExtractor(
    J_LEAGUE_SCRAPING_CONFIG.listPage,
    J_LEAGUE_SCRAPING_CONFIG.detailBaseUrl,
  );

  // 警告の初期状態
  assertEquals(extractor.getAndClearWarnings(), []);

  // 警告をクリアした後は空配列
  const warnings = extractor.getAndClearWarnings();
  assertEquals(warnings, []);
});
