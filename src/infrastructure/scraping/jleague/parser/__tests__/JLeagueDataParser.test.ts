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

  // 2桁年の場合もparseMatchDateを使用してJST→UTC変換されることを確認
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

  // 不正な日時の場合は基本日付解析（matchDate: "3/15"）にフォールバックすることを確認
  // 年跨ぎロジックにより2025年3月15日と判定され、JST→UTC変換適用
  assertEquals(ticket.matchDate.toISOString(), '2025-02-14T17:10:00.000Z');
});
