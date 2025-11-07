import { assertEquals } from 'std/assert/mod.ts';
import { DateCalculationService } from '@/domain/services/DateCalculationService.ts';
import { SaleStatusService } from '@/domain/services/SaleStatusService.ts';

/**
 * SaleStatusService - 純粋なビジネスロジックのテスト
 * サイト固有のフォーマット解析テストは各サイトのParserテストに移動済み
 */
Deno.test('determineSaleStatus should return correct status based on dates', () => {
  const baseTime = new Date('2024-08-15T12:00:00Z');

  const saleStartDate = new Date('2024-08-16T10:00:00Z');
  const saleEndDate = new Date('2024-09-12T23:59:00Z');

  assertEquals(
    SaleStatusService.determineSaleStatus(saleStartDate, undefined, baseTime),
    'before_sale',
    'Should be before_sale when current time is before sale start',
  );

  const duringTime = new Date('2024-08-20T12:00:00Z');
  assertEquals(
    SaleStatusService.determineSaleStatus(saleStartDate, saleEndDate, duringTime),
    'on_sale',
    'Should be on_sale when current time is between start and end',
  );

  const afterTime = new Date('2024-09-13T12:00:00Z');
  assertEquals(
    SaleStatusService.determineSaleStatus(saleStartDate, saleEndDate, afterTime),
    'ended',
    'Should be ended when current time is after sale end',
  );

  const noStartTime = new Date('2024-08-10T12:00:00Z');
  assertEquals(
    SaleStatusService.determineSaleStatus(undefined, saleEndDate, noStartTime),
    'on_sale',
    'Should default to on_sale when no start date is provided',
  );
});

// 年跨ぎテストケース
Deno.test('determineYear - 12月実行時の翌年3月データ', () => {
  const currentDate = new Date(2024, 11, 15); // 2024年12月15日
  const result = DateCalculationService.determineYear(3, currentDate); // 3月
  assertEquals(result, 2025, '12月実行時の3月データは翌年として判定されるべき');
});

Deno.test('determineYear - 1月実行時の前年11月データ', () => {
  const currentDate = new Date(2025, 0, 15); // 2025年1月15日
  const result = DateCalculationService.determineYear(11, currentDate); // 11月
  assertEquals(result, 2024, '1月実行時の11月データは前年として判定されるべき（前シーズンの延長）');
});

Deno.test('determineYear - 8月実行時の翌年3月データ', () => {
  const currentDate = new Date(2025, 7, 15); // 2025年8月15日
  const result = DateCalculationService.determineYear(3, currentDate); // 3月
  assertEquals(result, 2026, '8月実行時の3月データは翌年として判定されるべき');
});

Deno.test('determineYear - 通常シーズン内', () => {
  const currentDate = new Date(2025, 6, 15); // 2025年7月15日
  const result = DateCalculationService.determineYear(9, currentDate); // 9月
  assertEquals(result, 2025, '通常シーズン内は同年として判定されるべき');
});

Deno.test('DateCalculationService.createMatchDateFromJST - 年跨ぎ対応', () => {
  const referenceDate = new Date(2024, 11, 15); // 2024年12月15日

  // 翌年3月の試合
  const marchMatch = DateCalculationService.createMatchDateFromJST(3, 15, 14, 0, referenceDate);
  assertEquals(marchMatch.getUTCFullYear(), 2025, '12月実行時の3月試合は翌年として処理');
  assertEquals(marchMatch.getUTCMonth(), 2, '月は正しく設定されるべき'); // 3月 = 2 (0-indexed)
  assertEquals(marchMatch.getUTCDate(), 15, 'JST 14:00 -> UTC same day 05:00'); // JST 3/15 14:00 -> UTC 3/15 05:00
  assertEquals(marchMatch.getUTCHours(), 5, 'JST 14:00 = UTC 05:00 (14-9)'); // JST 14:00 = UTC 05:00
});

// 販売日の年数計算テスト
Deno.test('DateCalculationService.determineSaleYear - 販売日が試合日より前（同年）', () => {
  const matchDate = new Date('2025-09-15T14:00:00+09:00'); // 2025年9月の試合

  // 8月の販売開始日（試合より前） → 同年
  const year = DateCalculationService.determineSaleYear(matchDate, 8, 15);
  assertEquals(year, 2025, '販売日が試合日より前の場合は同年');
});

Deno.test('DateCalculationService.determineSaleYear - 販売日が試合日より後（前年）', () => {
  const matchDate = new Date('2025-03-15T14:00:00+09:00'); // 2025年3月の試合

  // 11月の販売開始日（試合より後） → 前年
  const year = DateCalculationService.determineSaleYear(matchDate, 11, 20);
  assertEquals(year, 2024, '販売日が試合日より後の場合は前年');
});

Deno.test('DateCalculationService.determineSaleYear - 販売日と試合日が同じ日', () => {
  const matchDate = new Date('2025-09-15T14:00:00+09:00'); // 2025年9月15日の試合

  // 同じ日（時刻は異なる） → 同年
  const year = DateCalculationService.determineSaleYear(matchDate, 9, 15);
  assertEquals(year, 2025, '同じ日の場合は同年（時刻が異なっても）');
});

// JST→UTC変換の具体的テスト
Deno.test('DateCalculationService.createMatchDateFromJST - JST to UTC conversion verification', () => {
  // JST 2025-03-15 10:00 → UTC 2025-03-15 01:00
  const result = DateCalculationService.createMatchDateFromJST(
    3,
    15,
    10,
    0,
    new Date(2024, 11, 15),
  );

  assertEquals(result.getUTCFullYear(), 2025);
  assertEquals(result.getUTCMonth(), 2); // March
  assertEquals(result.getUTCDate(), 15); // JST 3/15 -> UTC 3/15
  assertEquals(result.getUTCHours(), 1); // JST 10:00 = UTC 01:00
  assertEquals(result.getUTCMinutes(), 0);

  // UTC時刻でISO文字列を確認
  assertEquals(result.toISOString(), '2025-03-15T01:00:00.000Z');
});

Deno.test('DateCalculationService.createMatchDateFromJST - JST midnight to UTC previous day', () => {
  // JST 2025-03-15 00:30 → UTC 2025-03-14 15:30
  const result = DateCalculationService.createMatchDateFromJST(
    3,
    15,
    0,
    30,
    new Date(2024, 11, 15),
  );

  assertEquals(result.getUTCFullYear(), 2025);
  assertEquals(result.getUTCMonth(), 2); // March
  assertEquals(result.getUTCDate(), 14); // JST 3/15 00:30 -> UTC 3/14 15:30 (previous day)
  assertEquals(result.getUTCHours(), 15); // JST 00:30 = UTC 15:30 (previous day)
  assertEquals(result.getUTCMinutes(), 30);
});
