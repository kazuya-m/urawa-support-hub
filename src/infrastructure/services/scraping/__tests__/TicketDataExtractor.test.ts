import { assertEquals } from 'jsr:@std/assert';
import { TicketDataParser } from '../transformation/components/TicketDataParser.ts';
import type { ScrapedTicketData } from '../types/ScrapedTicketData.ts';

const createTestData = (matchName: string, matchDate: string = '9/7'): ScrapedTicketData => ({
  matchName,
  matchDate,
  saleDate: null,
  ticketTypes: [],
  ticketUrl: 'https://example.com',
  venue: 'テスト会場',
  homeTeam: null,
  awayTeam: null,
  scrapedAt: new Date(),
  saleStatus: 'before_sale',
});

Deno.test('TicketDataParser - チーム抽出: vs パターン', () => {
  const result1 = TicketDataParser.parseAndValidate(
    createTestData('FC東京 vs 浦和レッズ'),
  );
  assertEquals(result1.success, true);
  assertEquals(result1.data?.homeTeam, 'FC東京');
  assertEquals(result1.data?.awayTeam, '浦和レッズ');

  const result2 = TicketDataParser.parseAndValidate(
    createTestData('横浜F・マリノス VS ガンバ大阪', '9/8'),
  );
  assertEquals(result2.success, true);
  assertEquals(result2.data?.homeTeam, '横浜F・マリノス');
  assertEquals(result2.data?.awayTeam, 'ガンバ大阪');

  const result3 = TicketDataParser.parseAndValidate(
    createTestData('鹿島アントラーズvs川崎フロンターレ', '9/9'),
  );
  assertEquals(result3.success, true);
  assertEquals(result3.data?.homeTeam, '鹿島アントラーズ');
  assertEquals(result3.data?.awayTeam, '川崎フロンターレ');
});

Deno.test('TicketDataParser - チーム抽出: 対 パターン', () => {
  const result = TicketDataParser.parseAndValidate(
    createTestData('FC東京 対 浦和レッズ'),
  );
  assertEquals(result.success, true);
  assertEquals(result.data?.homeTeam, 'FC東京');
  assertEquals(result.data?.awayTeam, '浦和レッズ');
});

Deno.test('TicketDataParser - チーム抽出: ダッシュ パターン', () => {
  const result1 = TicketDataParser.parseAndValidate(
    createTestData('FC東京 - 浦和レッズ'),
  );
  assertEquals(result1.success, true);
  assertEquals(result1.data?.homeTeam, 'FC東京');
  assertEquals(result1.data?.awayTeam, '浦和レッズ');

  const result2 = TicketDataParser.parseAndValidate(
    createTestData('横浜F・マリノス−ガンバ大阪', '9/8'),
  );
  assertEquals(result2.success, true);
  assertEquals(result2.data?.homeTeam, '横浜F・マリノス');
  assertEquals(result2.data?.awayTeam, 'ガンバ大阪');
});

Deno.test('TicketDataParser - チーム抽出: × パターン', () => {
  const result1 = TicketDataParser.parseAndValidate(
    createTestData('FC東京 × 浦和レッズ'),
  );
  assertEquals(result1.success, true);
  assertEquals(result1.data?.homeTeam, 'FC東京');
  assertEquals(result1.data?.awayTeam, '浦和レッズ');

  const result2 = TicketDataParser.parseAndValidate(
    createTestData('横浜F・マリノスx川崎フロンターレ', '9/8'),
  );
  assertEquals(result2.success, true);
  assertEquals(result2.data?.homeTeam, '横浜F・マリノス');
  assertEquals(result2.data?.awayTeam, '川崎フロンターレ');
});

Deno.test('TicketDataParser - チーム抽出: パターンにマッチしない場合', () => {
  const result1 = TicketDataParser.parseAndValidate(
    createTestData('単独チーム名'),
  );
  assertEquals(result1.success, true);
  assertEquals(result1.data?.homeTeam, undefined);
  assertEquals(result1.data?.awayTeam, undefined);

  const result2 = TicketDataParser.parseAndValidate(
    createTestData('天皇杯決勝', '9/8'),
  );
  assertEquals(result2.success, true);
  assertEquals(result2.data?.homeTeam, undefined);
  assertEquals(result2.data?.awayTeam, undefined);
});

Deno.test('TicketDataParser - チーム抽出: スペースと記号のバリエーション', () => {
  // スペースありなし
  const result1 = TicketDataParser.parseAndValidate(
    createTestData('FC東京vs浦和レッズ'),
  );
  assertEquals(result1.success, true);
  assertEquals(result1.data?.homeTeam, 'FC東京');
  assertEquals(result1.data?.awayTeam, '浦和レッズ');

  // 複数スペース
  const result2 = TicketDataParser.parseAndValidate(
    createTestData('FC東京   vs   浦和レッズ', '9/8'),
  );
  assertEquals(result2.success, true);
  assertEquals(result2.data?.homeTeam, 'FC東京');
  assertEquals(result2.data?.awayTeam, '浦和レッズ');

  // 全角文字混在
  const result3 = TicketDataParser.parseAndValidate(
    createTestData('ＦＣ東京　ｖｓ　浦和レッズ', '9/9'),
  );
  assertEquals(result3.success, true);
  assertEquals(result3.data?.homeTeam, 'ＦＣ東京');
  assertEquals(result3.data?.awayTeam, '浦和レッズ');
});
