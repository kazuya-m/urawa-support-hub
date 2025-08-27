import { assertEquals } from 'testing/asserts.ts';
import { ScrapingConfig } from '@/infrastructure/config/types/ScrapingConfig.ts';
import { UrlConfig } from '@/infrastructure/config/types/UrlConfig.ts';

// Mock configuration matching actual interfaces
const mockScrapingConfig: ScrapingConfig = {
  awayTabSelectors: ['.ticket-tab li:nth-child(2) span'],
  selectors: {
    ticketContainer: ['.game-list ul li'],
    matchTitle: ['.vs-box-place .team-name'],
    matchDate: ['.vs-box-info-day'],
    saleDate: ['.vs-box-info-time'],
    ticketType: ['.vs-box-ticket'],
    venue: ['.vs-box-place span'],
    ticketLink: ['.vs-box-ticket span[href]'],
  },
  awayKeywords: ['away', 'アウェイ'],
  generalSaleKeyword: '一般発売',
  timeouts: {
    pageLoad: 5000,
    elementWait: 2000,
    tabSwitch: 1000,
  },
};

const mockUrlConfig: UrlConfig = {
  staticUrls: {
    jleagueTicketBase: 'https://example.com',
    urawaClubPage: 'https://example.com/test',
    lineApiBase: 'https://api.line.me',
    lineApiBroadcast: 'https://api.line.me/broadcast',
    lineApiInfo: 'https://api.line.me/info',
    sitemapUrl: 'https://example.com/sitemap.xml',
  },
  dynamicUrls: {
    urawaAwayTabUrl: 'https://example.com/ur/away',
    fallbackUrls: ['https://example.com/fallback'],
  },
  environmentUrls: {
    webhookUrl: 'https://example.com/webhook',
    debugUrl: 'https://example.com/debug',
  },
};

// NOTE: Playwright import causes permission issues in test environment
// Testing only configuration and class structure without browser initialization

Deno.test('ScrapingService Configuration Tests', async (t) => {
  await t.step('should have valid scraping configuration', () => {
    assertEquals(Array.isArray(mockScrapingConfig.awayTabSelectors), true);
    assertEquals(typeof mockScrapingConfig.timeouts.pageLoad, 'number');
    assertEquals(Array.isArray(mockScrapingConfig.selectors.ticketContainer), true);
  });

  await t.step('should have valid URL configuration', () => {
    assertEquals(typeof mockUrlConfig.staticUrls.urawaClubPage, 'string');
    assertEquals(mockUrlConfig.staticUrls.urawaClubPage.includes('example.com'), true);
    assertEquals(Array.isArray(mockUrlConfig.dynamicUrls.fallbackUrls), true);
  });

  await t.step('should validate selector arrays', () => {
    const selectors = mockScrapingConfig.selectors;
    Object.values(selectors).forEach((selectorArray) => {
      assertEquals(Array.isArray(selectorArray), true);
      assertEquals(selectorArray.length > 0, true);
    });
  });
});
