import { assertEquals } from 'std/assert/mod.ts';
import { JLeagueDataExtractor } from '../JLeagueDataExtractor.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';

Deno.test('JLeagueDataExtractor - MockPageでのPlaywright非依存テスト', async () => {
  // チケット要素のない page のスタブ（$$ は空配列、$eval は値なし）
  const mockPage = {
    $$: () => Promise.resolve([]),
    $eval: () => Promise.resolve(null),
  } as unknown as Parameters<JLeagueDataExtractor['extractTickets']>[0];

  // JLeagueDataExtractorをテスト（Playwrightを起動せず）
  const extractor = new JLeagueDataExtractor(
    J_LEAGUE_SCRAPING_CONFIG.listPage,
    J_LEAGUE_SCRAPING_CONFIG.detailBaseUrl,
  );

  // 実際のPlaywrightは起動しない
  const result = await extractor.extractTickets(mockPage);

  // チケット要素がないので空配列
  assertEquals(result, []);
  assertEquals(extractor.getAndClearWarnings().length >= 0, true);
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
