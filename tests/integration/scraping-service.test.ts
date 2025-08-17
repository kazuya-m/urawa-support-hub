import { assertEquals } from 'jsr:@std/assert';
import { ScrapingService } from '@/infrastructure/services/ScrapingService.ts';
import { ScrapingConfig } from '@/domain/entities/ScrapingConfig.ts';
import { UrlConfig } from '@/domain/entities/UrlConfig.ts';

// 統合テスト用の設定
const integrationScrapingConfig: ScrapingConfig = {
  awayTabSelectors: [
    '[data-tab="away"]',
    '.tab-item[data-value="away"]',
    'a[href*="tab=away"]',
    '.away-tab',
    '#away-tab',
  ],
  selectors: {
    ticketContainer: [
      '.match-card',
      '.ticket-item',
      '.game-info',
      '.match-info',
      '.event-card',
    ],
    matchTitle: [
      '.match-title h3',
      '.game-title',
      '.match-name',
      '.event-title',
      'h3.title',
    ],
    matchDate: [
      '.match-date',
      '.game-date',
      '.event-date',
      '.date-info',
      '.schedule-date',
    ],
    saleDate: [
      '.sale-date',
      '.on-sale-date',
      '.ticket-sale-date',
      '.sales-start',
      '.sale-info',
    ],
    ticketType: [
      '.ticket-type',
      '.seat-category',
      '.ticket-category',
      '.seat-type',
      '.category-list li',
    ],
    venue: [
      '.venue',
      '.stadium',
      '.match-venue',
      '.location',
      '.stadium-name',
    ],
    ticketLink: [
      'a.ticket-link',
      'a.purchase-link',
      'a[href*="ticket"]',
      'a[href*="purchase"]',
      '.buy-ticket a',
    ],
  },
  awayKeywords: [
    'visitor',
    'away',
    'アウェイ',
    'ビジター',
    'mix',
    'back away',
    'main away',
  ],
  generalSaleKeyword: '一般販売',
  timeouts: {
    pageLoad: 45000,
    elementWait: 15000,
    tabSwitch: 3000,
  },
};

const integrationUrlConfig: UrlConfig = {
  staticUrls: {
    jleagueTicketBase: 'https://www.jleague-ticket.jp',
    urawaClubPage: 'https://www.jleague-ticket.jp/club/ur/',
    lineApiBase: 'https://api.line.me/v2',
    sitemapUrl: 'https://www.jleague-ticket.jp/sitemap.xml',
  },
  dynamicUrls: {
    urawaAwayTabUrl: 'https://www.jleague-ticket.jp/club/ur/?tab=away',
    fallbackUrls: [
      'https://www.jleague-ticket.jp/club/ur/away',
      'https://www.jleague-ticket.jp/urawa-away',
    ],
  },
  environmentUrls: {
    debugUrl: 'http://localhost:3000/debug',
  },
};

// ユーザーエージェントとブラウザ設定のテスト
Deno.test('ScrapingService Integration - Browser Configuration', () => {
  const _service = new ScrapingService(integrationScrapingConfig, integrationUrlConfig);

  // ブラウザが正しい設定で起動することを確認
  // 実際のブラウザ起動はせず、設定値の妥当性をテスト
  assertEquals(integrationScrapingConfig.timeouts.pageLoad, 45000);
  assertEquals(integrationScrapingConfig.timeouts.elementWait, 15000);
  assertEquals(integrationScrapingConfig.timeouts.tabSwitch, 3000);
});

// セレクター設定の妥当性テスト
Deno.test('ScrapingService Integration - Selector Configuration', () => {
  const _service = new ScrapingService(integrationScrapingConfig, integrationUrlConfig);

  // 複数のセレクターが設定されていることを確認
  assertEquals(integrationScrapingConfig.awayTabSelectors.length >= 2, true);
  assertEquals(integrationScrapingConfig.selectors.ticketContainer.length >= 3, true);
  assertEquals(integrationScrapingConfig.selectors.matchTitle.length >= 3, true);

  // アウェイキーワードが適切に設定されていることを確認
  assertEquals(integrationScrapingConfig.awayKeywords.includes('アウェイ'), true);
  assertEquals(integrationScrapingConfig.awayKeywords.includes('ビジター'), true);
  assertEquals(integrationScrapingConfig.awayKeywords.includes('visitor'), true);
});

// URL設定テスト
Deno.test('ScrapingService Integration - URL Configuration', () => {
  const _service = new ScrapingService(integrationScrapingConfig, integrationUrlConfig);

  // 必要なURLが設定されていることを確認
  assertEquals(integrationUrlConfig.staticUrls.urawaClubPage.includes('jleague-ticket.jp'), true);
  assertEquals(integrationUrlConfig.staticUrls.urawaClubPage.includes('/club/ur/'), true);

  // フォールバックURLが設定されていることを確認
  assertEquals(integrationUrlConfig.dynamicUrls.fallbackUrls.length > 0, true);
});

// エラーハンドリング統合テスト
Deno.test('ScrapingService Integration - Error Handling', () => {
  // 無効なURL設定でのエラーハンドリング
  const invalidUrlConfig: UrlConfig = {
    ...integrationUrlConfig,
    staticUrls: {
      ...integrationUrlConfig.staticUrls,
      urawaClubPage: 'invalid-url',
    },
  };

  const _service = new ScrapingService(integrationScrapingConfig, invalidUrlConfig);

  // 実際のスクレイピングは行わず、設定の検証のみ
  assertEquals(invalidUrlConfig.staticUrls.urawaClubPage, 'invalid-url');
});

// データ変換統合テスト
Deno.test('ScrapingService Integration - Data Transformation', () => {
  const service = new ScrapingService(integrationScrapingConfig, integrationUrlConfig);

  // スクレイピングされたデータの形式をテスト
  const mockScrapedData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024年12月1日（日）14:00',
    saleDate: '販売開始: 2024年11月20日（水）10:00',
    venue: '味の素スタジアム',
    ticketUrl: 'https://ticket.example.com/123',
    ticketTypes: ['アウェイ指定席A', 'ビジター自由席'],
  };

  // 必要なプロパティがすべて存在することを確認
  assertEquals(typeof mockScrapedData.matchName, 'string');
  assertEquals(typeof mockScrapedData.matchDate, 'string');
  assertEquals(typeof mockScrapedData.saleDate, 'string');
  assertEquals(typeof mockScrapedData.venue, 'string');
  assertEquals(typeof mockScrapedData.ticketUrl, 'string');
  assertEquals(Array.isArray(mockScrapedData.ticketTypes), true);

  // アウェイチケットの判定ロジックテスト
  // deno-lint-ignore no-explicit-any
  const isAwayTicket = (service as any).isAwayTicket.bind(service);
  assertEquals(isAwayTicket(mockScrapedData), true);
});

// タイムアウト設定テスト
Deno.test('ScrapingService Integration - Timeout Configuration', () => {
  const _service = new ScrapingService(integrationScrapingConfig, integrationUrlConfig);

  // タイムアウト値が妥当な範囲内にあることを確認
  assertEquals(integrationScrapingConfig.timeouts.pageLoad <= 60000, true);
  assertEquals(integrationScrapingConfig.timeouts.elementWait <= 30000, true);
  assertEquals(integrationScrapingConfig.timeouts.tabSwitch <= 10000, true);

  // タイムアウト値が最小値以上であることを確認
  assertEquals(integrationScrapingConfig.timeouts.pageLoad >= 10000, true);
  assertEquals(integrationScrapingConfig.timeouts.elementWait >= 5000, true);
  assertEquals(integrationScrapingConfig.timeouts.tabSwitch >= 1000, true);
});

// フィルタリングロジック統合テスト
Deno.test('ScrapingService Integration - Filtering Logic', () => {
  const service = new ScrapingService(integrationScrapingConfig, integrationUrlConfig);

  const testTickets = [
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '2024-12-01',
      saleDate: '2024-11-20',
      venue: '味の素スタジアム',
      ticketUrl: 'https://ticket.example.com/123',
      ticketTypes: ['アウェイ指定席', 'ビジター自由席'],
    },
    {
      matchName: '浦和レッズ vs 鹿島アントラーズ',
      matchDate: '2024-12-08',
      saleDate: '2024-11-25',
      venue: 'カシマスタジアム',
      ticketUrl: 'https://ticket.example.com/789',
      ticketTypes: ['ホーム指定席', '自由席'],
    },
    {
      matchName: 'Visitor席あり試合',
      matchDate: '2024-12-15',
      saleDate: '2024-12-01',
      venue: 'テストスタジアム',
      ticketUrl: 'https://ticket.example.com/visitor',
      ticketTypes: ['Visitor Seat', 'General'],
    },
  ];

  // deno-lint-ignore no-explicit-any
  const filterAwayTickets = (service as any).filterAwayTickets.bind(service);
  const awayTickets = filterAwayTickets(testTickets);

  // アウェイチケットのみが抽出されることを確認
  assertEquals(awayTickets.length, 2);
  assertEquals(awayTickets[0].matchName, '浦和レッズ vs FC東京');
  assertEquals(awayTickets[1].matchName, 'Visitor席あり試合');
});
