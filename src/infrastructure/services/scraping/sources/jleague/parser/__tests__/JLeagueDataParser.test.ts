import { assertEquals } from 'std/assert/mod.ts';
import { JLeagueDataParser } from '../JLeagueDataParser.ts';
import { JLeagueRawTicketData } from '../../types/JLeagueTypes.ts';

Deno.test('JLeagueDataParser - 4桁年形式のタイムゾーン変換テスト', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '3/15',
    enhancedMatchDateTime: '2025/03/15 14:00', // JST時刻
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: '02/20(木)10:00〜',
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-02-01T03:00:00.000Z'),
  };

  const referenceDate = new Date('2025-02-01T03:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  // JST 2025/03/15 14:00 → UTC 2025-03-15 05:00 に変換されることを確認
  assertEquals(ticket.matchDate.getUTCFullYear(), 2025);
  assertEquals(ticket.matchDate.getUTCMonth(), 2); // March (0-indexed)
  assertEquals(ticket.matchDate.getUTCDate(), 15); // Same date in UTC
  assertEquals(ticket.matchDate.getUTCHours(), 5); // JST 14:00 = UTC 05:00 (14-9)
  assertEquals(ticket.matchDate.getUTCMinutes(), 0);

  // ISO文字列でUTC時刻を確認
  assertEquals(ticket.matchDate.toISOString(), '2025-03-15T05:00:00.000Z');
});

Deno.test('JLeagueDataParser - 4桁年深夜時刻のタイムゾーン変換テスト', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '3/15',
    enhancedMatchDateTime: '2025/03/15 01:00', // JST深夜時刻
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: undefined,
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-02-01T03:00:00.000Z'),
  };

  const referenceDate = new Date('2025-02-01T03:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  // JST 2025/03/15 01:00 → UTC 2025-03-14 16:00 (前日)に変換されることを確認
  assertEquals(ticket.matchDate.getUTCFullYear(), 2025);
  assertEquals(ticket.matchDate.getUTCMonth(), 2); // March (0-indexed)
  assertEquals(ticket.matchDate.getUTCDate(), 14); // UTC previous day
  assertEquals(ticket.matchDate.getUTCHours(), 16); // JST 01:00 = UTC 16:00 (previous day)
  assertEquals(ticket.matchDate.getUTCMinutes(), 0);

  // ISO文字列でUTC時刻を確認
  assertEquals(ticket.matchDate.toISOString(), '2025-03-14T16:00:00.000Z');
});

Deno.test('JLeagueDataParser - 2桁年フォールバック時のタイムゾーン変換テスト', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '3/15',
    enhancedMatchDateTime: '25/03/15 14:00', // 2桁年形式（フォールバックテスト）
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: undefined,
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-02-01T03:00:00.000Z'),
  };

  const referenceDate = new Date('2025-02-01T03:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  // 2桁年の場合もDateCalculationService.createMatchDateFromJSTを使用してJST→UTC変換されることを確認
  assertEquals(ticket.matchDate.getUTCFullYear(), 2025);
  assertEquals(ticket.matchDate.getUTCMonth(), 2); // March (0-indexed)
  assertEquals(ticket.matchDate.getUTCDate(), 15); // Same date in UTC
  assertEquals(ticket.matchDate.getUTCHours(), 5); // JST 14:00 = UTC 05:00 (14-9)
  assertEquals(ticket.matchDate.getUTCMinutes(), 0);
});

Deno.test('JLeagueDataParser - 不正な日時フォーマット時のエラーハンドリング', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '3/15',
    enhancedMatchDateTime: '2025/13/45 25:70', // 不正な日時
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: undefined,
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-02-01T03:00:00.000Z'),
  };

  const referenceDate = new Date('2025-02-01T03:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  // 不正な日時の場合はreferenceDateにフォールバックすることを確認
  assertEquals(ticket.matchDate.toISOString(), referenceDate.toISOString());
});

/**
 * Jリーグサイト固有の販売日時フォーマット解析テスト
 */
Deno.test('JLeagueDataParser - 販売前フォーマット解析（曜日付き）', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '9/15',
    enhancedMatchDateTime: '2025/09/15 14:00',
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: '08/15(金)10:00〜', // Jリーグ固有フォーマット
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-08-01T00:00:00.000Z'),
  };

  const referenceDate = new Date('2025-08-01T00:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  assertEquals(ticket.saleStatus, 'before_sale');
  assertEquals(ticket.saleStartDate?.getUTCMonth(), 7); // August (0-indexed)
  assertEquals(ticket.saleStartDate?.getUTCDate(), 15);
  assertEquals(ticket.saleStartDate?.getUTCHours(), 1); // JST 10:00 = UTC 01:00
  assertEquals(ticket.saleEndDate, null);
});

Deno.test('JLeagueDataParser - 販売中フォーマット解析（終了日指定）', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '10/15',
    enhancedMatchDateTime: '2025/10/15 14:00',
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: '〜09/12(金)23:59', // Jリーグ固有フォーマット
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-09-01T00:00:00.000Z'),
  };

  const referenceDate = new Date('2025-09-01T00:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  assertEquals(ticket.saleStatus, 'on_sale');
  assertEquals(ticket.saleStartDate, null);
  assertEquals(ticket.saleEndDate?.getUTCMonth(), 8); // September (0-indexed)
  assertEquals(ticket.saleEndDate?.getUTCDate(), 12);
  assertEquals(ticket.saleEndDate?.getUTCHours(), 14); // JST 23:59 = UTC 14:59
});

Deno.test('JLeagueDataParser - フルレンジフォーマット解析', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '10/15',
    enhancedMatchDateTime: '2025/10/15 14:00',
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: '08/15(金)10:00〜09/12(金)23:59', // Jリーグ固有フォーマット
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2025-08-01T00:00:00.000Z'),
  };

  const referenceDate = new Date('2025-08-01T00:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  assertEquals(ticket.saleStartDate?.getUTCMonth(), 7); // August (0-indexed)
  assertEquals(ticket.saleStartDate?.getUTCDate(), 15);
  assertEquals(ticket.saleEndDate?.getUTCMonth(), 8); // September (0-indexed)
  assertEquals(ticket.saleEndDate?.getUTCDate(), 12);
});

Deno.test('JLeagueDataParser - 年跨ぎ対応（試合日基準）', async () => {
  const parser = new JLeagueDataParser();

  const rawData: JLeagueRawTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '3/20',
    enhancedMatchDateTime: '2025/03/20 14:00', // 2025年3月の試合
    venue: '埼玉スタジアム2002',
    competition: 'J1リーグ',
    saleDate: '11/20(水)10:00〜', // 11月の販売開始（前年）
    ticketTypes: [],
    ticketUrl: 'https://example.com/ticket',
    scrapedAt: new Date('2024-11-15T00:00:00.000Z'),
  };

  const referenceDate = new Date('2024-11-15T00:00:00.000Z');
  const ticket = await parser.parseToTicket(rawData, referenceDate);

  assertEquals(ticket.saleStatus, 'before_sale');
  // 販売開始日が試合日より後になる場合は前年にする
  assertEquals(ticket.saleStartDate?.getUTCFullYear(), 2024);
  assertEquals(ticket.saleStartDate?.getUTCMonth(), 10); // November (0-indexed)

  // 販売開始日 < 試合日 を確認
  if (ticket.saleStartDate && ticket.matchDate) {
    assertEquals(
      ticket.saleStartDate < ticket.matchDate,
      true,
      '販売開始日は試合日より前でなければならない',
    );
  }
});
