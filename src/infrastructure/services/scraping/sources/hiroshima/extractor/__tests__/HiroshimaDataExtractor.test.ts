import { assertEquals } from 'std/assert/mod.ts';
import { HiroshimaDataExtractor } from '../HiroshimaDataExtractor.ts';
import { HIROSHIMA_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/hiroshima/HiroshimaConfig.ts';
import { MockPlaywrightClient } from '@/shared/testing/mocks/MockPlaywrightClient.ts';

Deno.test('HiroshimaDataExtractor', async (t) => {
  const extractor = new HiroshimaDataExtractor(
    HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
    HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
  );

  await t.step('extractTickets メソッドが呼び出し可能', async () => {
    const mockClient = new MockPlaywrightClient();
    await mockClient.launch();
    const mockPage = await mockClient.createPage();

    // Empty data case - should return empty array without errors
    const tickets = await extractor.extractTickets(mockPage);
    assertEquals(Array.isArray(tickets), true);
  });

  await t.step('constructor が正しく動作する', () => {
    // Should not throw error
    const newExtractor = new HiroshimaDataExtractor(
      HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
      HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
    );
    assertEquals(typeof newExtractor, 'object');
  });

  await t.step('getAndClearWarnings が動作する', async () => {
    const mockClient = new MockPlaywrightClient();
    await mockClient.launch();
    const mockPage = await mockClient.createPage();

    await extractor.extractTickets(mockPage);
    const warnings = extractor.getAndClearWarnings();
    assertEquals(Array.isArray(warnings), true);

    // 警告がクリアされることを確認
    const warningsAfterClear = extractor.getAndClearWarnings();
    assertEquals(warningsAfterClear.length, 0);
  });
});
