import { assertEquals } from 'jsr:@std/assert';
import { TicketDataExtractor } from '../TicketDataExtractor.ts';

Deno.test('TicketDataExtractor - チーム抽出: vs パターン', () => {
  const result1 = TicketDataExtractor.extractTeamsFromMatchName('FC東京 vs 浦和レッズ');
  assertEquals(result1.homeTeam, 'FC東京');
  assertEquals(result1.awayTeam, '浦和レッズ');

  const result2 = TicketDataExtractor.extractTeamsFromMatchName('横浜F・マリノス VS ガンバ大阪');
  assertEquals(result2.homeTeam, '横浜F・マリノス');
  assertEquals(result2.awayTeam, 'ガンバ大阪');

  const result3 = TicketDataExtractor.extractTeamsFromMatchName(
    '鹿島アントラーズvs川崎フロンターレ',
  );
  assertEquals(result3.homeTeam, '鹿島アントラーズ');
  assertEquals(result3.awayTeam, '川崎フロンターレ');
});

Deno.test('TicketDataExtractor - チーム抽出: 対 パターン', () => {
  const result = TicketDataExtractor.extractTeamsFromMatchName('FC東京 対 浦和レッズ');
  assertEquals(result.homeTeam, 'FC東京');
  assertEquals(result.awayTeam, '浦和レッズ');
});

Deno.test('TicketDataExtractor - チーム抽出: ダッシュ パターン', () => {
  const result1 = TicketDataExtractor.extractTeamsFromMatchName('FC東京 - 浦和レッズ');
  assertEquals(result1.homeTeam, 'FC東京');
  assertEquals(result1.awayTeam, '浦和レッズ');

  const result2 = TicketDataExtractor.extractTeamsFromMatchName('横浜F・マリノス−ガンバ大阪');
  assertEquals(result2.homeTeam, '横浜F・マリノス');
  assertEquals(result2.awayTeam, 'ガンバ大阪');
});

Deno.test('TicketDataExtractor - チーム抽出: × パターン', () => {
  const result1 = TicketDataExtractor.extractTeamsFromMatchName('FC東京 × 浦和レッズ');
  assertEquals(result1.homeTeam, 'FC東京');
  assertEquals(result1.awayTeam, '浦和レッズ');

  const result2 = TicketDataExtractor.extractTeamsFromMatchName('横浜F・マリノスx川崎フロンターレ');
  assertEquals(result2.homeTeam, '横浜F・マリノス');
  assertEquals(result2.awayTeam, '川崎フロンターレ');
});

Deno.test('TicketDataExtractor - チーム抽出: パターンにマッチしない場合', () => {
  const result1 = TicketDataExtractor.extractTeamsFromMatchName('単独チーム名');
  assertEquals(result1.homeTeam, undefined);
  assertEquals(result1.awayTeam, undefined);

  const result2 = TicketDataExtractor.extractTeamsFromMatchName('');
  assertEquals(result2.homeTeam, undefined);
  assertEquals(result2.awayTeam, undefined);

  const result3 = TicketDataExtractor.extractTeamsFromMatchName('天皇杯決勝');
  assertEquals(result3.homeTeam, undefined);
  assertEquals(result3.awayTeam, undefined);
});

Deno.test('TicketDataExtractor - チーム抽出: スペースと記号のバリエーション', () => {
  // スペースありなし
  const result1 = TicketDataExtractor.extractTeamsFromMatchName('FC東京vs浦和レッズ');
  assertEquals(result1.homeTeam, 'FC東京');
  assertEquals(result1.awayTeam, '浦和レッズ');

  // 複数スペース
  const result2 = TicketDataExtractor.extractTeamsFromMatchName('FC東京   vs   浦和レッズ');
  assertEquals(result2.homeTeam, 'FC東京');
  assertEquals(result2.awayTeam, '浦和レッズ');

  // 全角文字混在
  const result3 = TicketDataExtractor.extractTeamsFromMatchName('ＦＣ東京　ｖｓ　浦和レッズ');
  assertEquals(result3.homeTeam, 'ＦＣ東京');
  assertEquals(result3.awayTeam, '浦和レッズ');
});
