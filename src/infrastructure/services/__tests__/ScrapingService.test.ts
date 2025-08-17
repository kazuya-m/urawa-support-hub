import { assertEquals } from 'jsr:@std/assert';
import { ScrapingService } from '../ScrapingService.ts';
import { ScrapingConfig } from '@/domain/entities/ScrapingConfig.ts';
import { UrlConfig } from '@/domain/entities/UrlConfig.ts';

// テスト用設定
const mockScrapingConfig: ScrapingConfig = {
  awayTabSelectors: ['[data-tab="away"]', '.away-tab'],
  selectors: {
    ticketContainer: ['.ticket-item', '.match-info'],
    matchTitle: ['.match-title', 'h3'],
    matchDate: ['.match-date', '.date'],
    saleDate: ['.sale-date', '.on-sale'],
    ticketType: ['.ticket-type', '.category'],
    venue: ['.venue', '.stadium'],
    ticketLink: ['a.ticket-link', 'a[href*="ticket"]'],
  },
  awayKeywords: ['visitor', 'away', 'アウェイ', 'ビジター'],
  generalSaleKeyword: '一般販売',
  timeouts: {
    pageLoad: 30000,
    elementWait: 10000,
    tabSwitch: 2000,
  },
};

const mockUrlConfig: UrlConfig = {
  staticUrls: {
    jleagueTicketBase: 'https://www.jleague-ticket.jp',
    urawaClubPage: 'https://www.jleague-ticket.jp/club/ur/',
    lineApiBase: 'https://api.line.me/v2',
    sitemapUrl: 'https://example.com/sitemap.xml',
  },
  dynamicUrls: {
    urawaAwayTabUrl: 'https://www.jleague-ticket.jp/club/ur/?tab=away',
    fallbackUrls: [],
  },
  environmentUrls: {},
};

Deno.test('ScrapingService - constructor', () => {
  const service = new ScrapingService(mockScrapingConfig, mockUrlConfig);
  assertEquals(service instanceof ScrapingService, true);
});

Deno.test('ScrapingService - isAwayTicket filtering', () => {
  const service = new ScrapingService(mockScrapingConfig, mockUrlConfig);

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
  ];

  // プライベートメソッドを直接テスト（TypeScript の制約を回避）
  // deno-lint-ignore no-explicit-any
  const isAwayTicket = (service as any).isAwayTicket.bind(service);

  assertEquals(isAwayTicket(testTickets[0]), true);
  assertEquals(isAwayTicket(testTickets[1]), true); // カシマスタジアムはアウェイ会場なので true
});

Deno.test('ScrapingService - filterAwayTickets', () => {
  const service = new ScrapingService(mockScrapingConfig, mockUrlConfig);

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
      matchName: '横浜F・マリノス vs 浦和レッズ',
      matchDate: '2024-12-15',
      saleDate: '2024-12-01',
      venue: '日産スタジアム',
      ticketUrl: 'https://ticket.example.com/456',
      ticketTypes: ['ホーム指定席', 'ビジター指定席'],
    },
    {
      matchName: 'テストマッチ',
      matchDate: '2024-12-20',
      saleDate: '2024-12-05',
      venue: 'テストスタジアム',
      ticketUrl: 'https://ticket.example.com/789',
      ticketTypes: ['ホーム指定席', '自由席'],
    },
  ];

  // deno-lint-ignore no-explicit-any
  const filterAwayTickets = (service as any).filterAwayTickets.bind(service);
  const awayTickets = filterAwayTickets(testTickets);

  assertEquals(awayTickets.length, 3); // 全て非埼玉スタジアムなのでアウェイ
  assertEquals(awayTickets[0].matchName, '浦和レッズ vs FC東京');
});

Deno.test('ScrapingService - away keywords detection', () => {
  const service = new ScrapingService(mockScrapingConfig, mockUrlConfig);

  const testCases = [
    // アウェイキーワードを含む場合
    {
      ticket: {
        matchName: '浦和レッズ vs FC東京',
        matchDate: '2024-12-01',
        saleDate: '2024-11-20',
        venue: '味の素スタジアム',
        ticketUrl: 'https://ticket.example.com/123',
        ticketTypes: ['アウェイ指定席'],
      },
      expected: true,
    },
    // visitor キーワードを含む場合
    {
      ticket: {
        matchName: 'FC東京 vs 浦和レッズ',
        matchDate: '2024-12-01',
        saleDate: '2024-11-20',
        venue: '味の素スタジアム',
        ticketUrl: 'https://ticket.example.com/123',
        ticketTypes: ['Visitor席'],
      },
      expected: true,
    },
    // 試合名にawayが含まれる場合
    {
      ticket: {
        matchName: 'Away game vs 浦和レッズ',
        matchDate: '2024-12-01',
        saleDate: '2024-11-20',
        venue: '味の素スタジアム',
        ticketUrl: 'https://ticket.example.com/123',
        ticketTypes: ['指定席'],
      },
      expected: true,
    },
    // アウェイキーワードを含まない場合
    {
      ticket: {
        matchName: '浦和レッズ vs FC東京',
        matchDate: '2024-12-01',
        saleDate: '2024-11-20',
        venue: '埼玉スタジアム',
        ticketUrl: 'https://ticket.example.com/123',
        ticketTypes: ['ホーム指定席', '自由席'],
      },
      expected: false,
    },
  ];

  // deno-lint-ignore no-explicit-any
  const isAwayTicket = (service as any).isAwayTicket.bind(service);

  testCases.forEach(({ ticket, expected }, index) => {
    const result = isAwayTicket(ticket);
    assertEquals(result, expected, `Test case ${index + 1} failed`);
  });
});

Deno.test('ScrapingService - configuration validation', () => {
  const _service = new ScrapingService(mockScrapingConfig, mockUrlConfig);

  // 設定値の検証
  assertEquals(mockScrapingConfig.awayTabSelectors.length > 0, true);
  assertEquals(mockScrapingConfig.selectors.ticketContainer.length > 0, true);
  assertEquals(mockScrapingConfig.awayKeywords.length > 0, true);
  assertEquals(mockScrapingConfig.timeouts.pageLoad > 0, true);
  assertEquals(mockScrapingConfig.timeouts.elementWait > 0, true);
  assertEquals(mockScrapingConfig.timeouts.tabSwitch > 0, true);

  assertEquals(mockUrlConfig.staticUrls.urawaClubPage.includes('jleague-ticket.jp'), true);
});

Deno.test('ScrapingService - ticket type filtering edge cases', () => {
  const service = new ScrapingService(mockScrapingConfig, mockUrlConfig);
  // deno-lint-ignore no-explicit-any
  const isAwayTicket = (service as any).isAwayTicket.bind(service);

  // 空のチケットタイプ配列
  const emptyTypesTicket = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024-12-01',
    saleDate: '2024-11-20',
    venue: '埼玉スタジアム２００２', // ホーム会場
    ticketUrl: 'https://ticket.example.com/123',
    ticketTypes: [],
  };
  assertEquals(isAwayTicket(emptyTypesTicket), false);

  // 大文字小文字の混在
  const mixedCaseTicket = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024-12-01',
    saleDate: '2024-11-20',
    venue: '味の素スタジアム', // アウェイ会場だがキーワード優先で判定
    ticketUrl: 'https://ticket.example.com/123',
    ticketTypes: ['VISITOR席', 'Away指定'],
  };
  assertEquals(isAwayTicket(mixedCaseTicket), true);
});
