import { assertEquals } from 'jsr:@std/assert';
import { MockScrapingService } from './MockScrapingService.ts';
import { URAWA_SCRAPING_CONFIG } from '@/config/scraping-config.ts';
import { URAWA_URL_CONFIG } from '@/config/url-config.ts';

Deno.test('UrawaScrapingService - constructor', () => {
  const service = new MockScrapingService(URAWA_SCRAPING_CONFIG, URAWA_URL_CONFIG);
  assertEquals(service instanceof MockScrapingService, true);
});

Deno.test('UrawaScrapingService - configuration validation', () => {
  // スクレイピング設定の妥当性検証
  assertEquals(URAWA_SCRAPING_CONFIG.awayTabSelectors.length > 0, true);
  assertEquals(URAWA_SCRAPING_CONFIG.selectors.ticketContainer.length > 0, true);
  assertEquals(URAWA_SCRAPING_CONFIG.awayKeywords.includes('アウェイ'), true);
  assertEquals(URAWA_SCRAPING_CONFIG.awayKeywords.includes('ビジター'), true);
  assertEquals(URAWA_SCRAPING_CONFIG.awayKeywords.includes('ミックス'), true);

  // URL設定の妥当性検証
  assertEquals(URAWA_URL_CONFIG.staticUrls.urawaClubPage.includes('jleague-ticket.jp'), true);
  assertEquals(URAWA_URL_CONFIG.staticUrls.urawaClubPage.includes('/club/ur/'), true);
});

Deno.test('UrawaScrapingService - away keywords detection', () => {
  const service = new MockScrapingService(URAWA_SCRAPING_CONFIG, URAWA_URL_CONFIG);

  const testCases = [
    // ビジター席の判定
    {
      ticket: {
        matchName: '清水エスパルス vs 浦和レッズ',
        matchDate: '2024-09-23',
        saleDate: '2024-09-10',
        venue: 'IAIスタジアム日本平',
        ticketUrl: 'https://ticket.example.com/123',
        ticketTypes: ['ビジター１F指定席', 'ビジター自由席'],
      },
      expected: true,
    },
    // アウェイ席の判定
    {
      ticket: {
        matchName: 'ガンバ大阪 vs 浦和レッズ',
        matchDate: '2024-09-13',
        saleDate: '2024-09-01',
        venue: 'パナソニック　スタジアム　吹田',
        ticketUrl: 'https://ticket.example.com/456',
        ticketTypes: ['アウェイ指定席', 'アウェイ自由席'],
      },
      expected: true,
    },
    // アウェイ会場での一般チケット
    {
      ticket: {
        matchName: '横浜F・マリノス vs 浦和レッズ',
        matchDate: '2024-10-18',
        saleDate: '2024-10-05',
        venue: '日産スタジアム',
        ticketUrl: 'https://ticket.example.com/789',
        ticketTypes: ['S指定席', 'A指定席'],
      },
      expected: true, // アウェイ会場なので true
    },
    // 駐車券（特殊チケット）
    {
      ticket: {
        matchName: '【駐車券】ガンバ大阪対浦和レッズ',
        matchDate: '2024-09-13',
        saleDate: '2024-09-01',
        venue: 'パナソニック　スタジアム　吹田',
        ticketUrl: 'https://ticket.example.com/parking',
        ticketTypes: ['駐車券'],
      },
      expected: false, // 駐車券は除外
    },
    // ホーム試合
    {
      ticket: {
        matchName: '浦和レッズ vs FC東京',
        matchDate: '2024-08-16',
        saleDate: '2024-08-01',
        venue: '埼玉スタジアム２００２',
        ticketUrl: 'https://ticket.example.com/home',
        ticketTypes: ['ホームS指定席', '自由席'],
      },
      expected: false,
    },
  ];

  const isAwayTicket = service.isAwayTicket.bind(service);

  testCases.forEach(({ ticket, expected }, index) => {
    const result = isAwayTicket(ticket);
    assertEquals(result, expected, `Test case ${index + 1} failed: ${ticket.matchName}`);
  });
});

Deno.test('UrawaScrapingService - selector configuration', () => {
  // 実際のサイト構造に対応したセレクター確認
  const config = URAWA_SCRAPING_CONFIG;

  // アウェイタブセレクター
  assertEquals(config.awayTabSelectors[0], 'ul.js-ticket-tab li:nth-child(2)');

  // 試合コンテナセレクター
  assertEquals(config.selectors.ticketContainer.includes('.game-list ul li'), true);

  // チーム名セレクター
  assertEquals(config.selectors.matchTitle.includes('.team-name'), true);

  // 会場セレクター
  assertEquals(config.selectors.venue.includes('.vs-box-place span'), true);
});

Deno.test('UrawaScrapingService - timeout configuration', () => {
  const config = URAWA_SCRAPING_CONFIG;

  // タイムアウト設定が適切な範囲内であることを確認
  assertEquals(config.timeouts.pageLoad, 45000);
  assertEquals(config.timeouts.elementWait, 15000);
  assertEquals(config.timeouts.tabSwitch, 3000);

  // 実用的な範囲内であることを確認
  assertEquals(config.timeouts.pageLoad <= 60000, true);
  assertEquals(config.timeouts.pageLoad >= 30000, true);
});

Deno.test('UrawaScrapingService - mock scraping data', async () => {
  const service = new MockScrapingService(URAWA_SCRAPING_CONFIG, URAWA_URL_CONFIG);

  const tickets = await service.scrapeAwayTickets();

  // モックデータが正しく返されることを確認
  assertEquals(tickets.length, 3);
  assertEquals(tickets[0].matchName, '清水エスパルス');
  assertEquals(tickets[1].matchName, 'ガンバ大阪');
  assertEquals(tickets[2].matchName, '横浜F・マリノス');

  // 全てアウェイチケットであることを確認
  tickets.forEach((ticket) => {
    const isAway = service.isAwayTicket(ticket);
    assertEquals(isAway, true, `${ticket.matchName} should be away ticket`);
  });
});

Deno.test('UrawaScrapingService - filtering functionality', async () => {
  const service = new MockScrapingService(URAWA_SCRAPING_CONFIG, URAWA_URL_CONFIG);

  const allTickets = await service.scrapeAwayTickets();

  // ホーム試合を混ぜたテストデータ
  const mixedTickets = [
    ...allTickets,
    {
      matchName: '浦和レッズ',
      matchDate: '2024-08-16',
      saleDate: '2024-08-01 10:00',
      venue: '埼玉スタジアム２００２',
      ticketUrl: 'https://ticket.example.com/home',
      ticketTypes: ['ホームS指定席', '自由席'],
    },
  ];

  const awayTickets = service.filterAwayTickets(mixedTickets);

  // アウェイチケットのみがフィルタリングされることを確認
  assertEquals(awayTickets.length, 3);
  awayTickets.forEach((ticket) => {
    assertEquals(ticket.venue.includes('埼玉スタジアム'), false);
  });
});
