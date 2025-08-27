import { assertEquals } from 'testing/asserts.ts';
import { URAWA_SCRAPING_CONFIG } from '@/infrastructure/config/scraping.ts';
import { URAWA_URL_CONFIG } from '@/infrastructure/config/url.ts';

// NOTE: Avoiding direct UrawaScrapingService import due to Playwright dependency
// Testing only configuration loading and validation

Deno.test('UrawaScrapingService Configuration Tests', async (t) => {
  await t.step('should load URAWA_SCRAPING_CONFIG correctly', () => {
    assertEquals(typeof URAWA_SCRAPING_CONFIG.timeouts.pageLoad, 'number');
    assertEquals(Array.isArray(URAWA_SCRAPING_CONFIG.awayTabSelectors), true);
    assertEquals(URAWA_SCRAPING_CONFIG.awayTabSelectors.length > 0, true);
  });

  await t.step('should load URAWA_URL_CONFIG correctly', () => {
    assertEquals(typeof URAWA_URL_CONFIG.staticUrls.urawaClubPage, 'string');
    assertEquals(URAWA_URL_CONFIG.staticUrls.urawaClubPage.includes('jleague-ticket'), true);
    assertEquals(typeof URAWA_URL_CONFIG.staticUrls.lineApiBase, 'string');
  });

  await t.step('should have proper selector configuration', () => {
    const selectors = URAWA_SCRAPING_CONFIG.selectors;
    assertEquals(Array.isArray(selectors.ticketContainer), true);
    assertEquals(Array.isArray(selectors.matchTitle), true);
    assertEquals(Array.isArray(selectors.venue), true);
    assertEquals(selectors.ticketContainer.length > 0, true);
  });

  await t.step('should have proper timeout configuration', () => {
    const timeouts = URAWA_SCRAPING_CONFIG.timeouts;
    assertEquals(timeouts.pageLoad > 0, true);
    assertEquals(timeouts.elementWait > 0, true);
    assertEquals(timeouts.tabSwitch > 0, true);
  });

  await t.step('should have away keywords configured', () => {
    assertEquals(Array.isArray(URAWA_SCRAPING_CONFIG.awayKeywords), true);
    assertEquals(URAWA_SCRAPING_CONFIG.awayKeywords.length > 0, true);
    assertEquals(typeof URAWA_SCRAPING_CONFIG.generalSaleKeyword, 'string');
  });
});
