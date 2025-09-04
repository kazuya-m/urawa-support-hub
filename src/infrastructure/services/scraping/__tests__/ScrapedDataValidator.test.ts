import { assertEquals } from 'jsr:@std/assert';
import { TicketDataParser } from '../transformation/components/TicketDataParser.ts';
import { ScrapedTicketData } from '../types/ScrapedTicketData.ts';

Deno.test('TicketDataParser.parseAndValidate - 必須データがすべて存在する場合', () => {
  const data: ScrapedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '5/15',
    saleDate: '05/01(水)10:00〜',
    venue: 'さいたまスタジアム',
    ticketUrl: 'https://example.com',
    ticketTypes: ['一般', '指定席'],
    homeTeam: '浦和レッズ',
    awayTeam: 'FC東京',
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  };

  const result = TicketDataParser.parseAndValidate(data);
  assertEquals(result.success, true);
  assertEquals(result.warnings.length, 0);
});

Deno.test('TicketDataParser.parseAndValidate - 必須データが不足している場合', () => {
  const data: ScrapedTicketData = {
    matchName: '',
    matchDate: '2024-05-15',
    saleDate: '',
    venue: '',
    ticketUrl: '',
    ticketTypes: [],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  };

  const result = TicketDataParser.parseAndValidate(data);
  assertEquals(result.success, false);
  assertEquals(result.skipReason, 'Missing matchName');
});

Deno.test('TicketDataParser.parseAndValidate - saleDateなしでも必須データがあれば成功', () => {
  const data: ScrapedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '5/15',
    saleDate: '', // 空だが、オプショナルなので問題なし
    venue: '',
    ticketUrl: '',
    ticketTypes: [],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  };

  const result = TicketDataParser.parseAndValidate(data);
  assertEquals(result.success, true); // saleDateが空でも成功
  assertEquals(result.warnings.length > 0, true); // 警告はある
});

Deno.test('TicketDataParser.parseAndValidate - オプショナルデータが不足している場合', () => {
  const data: ScrapedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '5/15',
    saleDate: '05/01(水)10:00〜',
    venue: '',
    ticketUrl: '',
    ticketTypes: [],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  };

  const result = TicketDataParser.parseAndValidate(data);
  assertEquals(result.success, true);
  assertEquals(result.warnings.length > 0, true); // venueやticketUrlの警告がある
});
