import { assertEquals } from 'std/assert/mod.ts';
import { DateCalculationService } from '@/domain/services/DateCalculationService.ts';
import { SaleStatusService } from '@/domain/services/SaleStatusService.ts';

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

Deno.test('SaleStatusService.parseSaleDate should parse before_sale format correctly', () => {
  const beforeSaleText = '08/15(金)10:00〜';
  const matchDate = new Date('2025-09-15T14:00:00+09:00'); // 9月の試合（販売日より後）
  const result = SaleStatusService.parseSaleDate(beforeSaleText, matchDate);

  assertEquals(result.saleStatus, 'before_sale');
  assertEquals(result.saleStartDate?.getUTCMonth(), 7); // August (0-indexed)
  assertEquals(result.saleStartDate?.getUTCDate(), 15); // JST 10:00 -> UTC same day 01:00
  assertEquals(result.saleStartDate?.getUTCHours(), 1); // JST 10:00 = UTC 01:00 (10-9)
  assertEquals(result.saleStartDate?.getUTCMinutes(), 0);
  assertEquals(result.saleEndDate, undefined);
});

Deno.test('SaleStatusService.parseSaleDate should parse on_sale format correctly', () => {
  const onSaleText = '〜09/12(金)23:59';
  const matchDate = new Date('2025-10-15T14:00:00+09:00'); // 10月の試合（販売終了日より後）
  const result = SaleStatusService.parseSaleDate(onSaleText, matchDate);

  assertEquals(result.saleStatus, 'on_sale');
  assertEquals(result.saleStartDate, undefined);
  assertEquals(result.saleEndDate?.getUTCMonth(), 8); // September (0-indexed)
  assertEquals(result.saleEndDate?.getUTCDate(), 12); // JST 23:59 -> UTC same day 14:59
  assertEquals(result.saleEndDate?.getUTCHours(), 14); // JST 23:59 = UTC 14:59 (23-9)
  assertEquals(result.saleEndDate?.getUTCMinutes(), 59);
});

Deno.test('SaleStatusService.parseSaleDate should parse full range format correctly', () => {
  const fullRangeText = '08/15(金)10:00〜09/12(金)23:59';
  const matchDate = new Date('2025-10-15T14:00:00+09:00'); // 10月の試合（販売期間より後）
  const result = SaleStatusService.parseSaleDate(fullRangeText, matchDate);

  assertEquals(result.saleStartDate?.getMonth(), 7); // August
  assertEquals(result.saleStartDate?.getDate(), 15);
  assertEquals(result.saleEndDate?.getMonth(), 8); // September
  assertEquals(result.saleEndDate?.getDate(), 12);

  assertEquals(typeof result.saleStatus, 'string');
  assertEquals(['before_sale', 'on_sale', 'sold_out', 'ended'].includes(result.saleStatus!), true);
});

Deno.test('SaleStatusService.parseSaleDate should throw error for unknown format', () => {
  const matchDate = new Date('2025-10-15T14:00:00+09:00');
  let errorThrown = false;
  try {
    SaleStatusService.parseSaleDate('Unknown format', matchDate);
  } catch (error) {
    errorThrown = true;
    assertEquals(error instanceof Error, true);
    if (error instanceof Error) {
      assertEquals(error.message.includes('Unknown sale date format'), true);
    }
  }
  assertEquals(errorThrown, true, 'Should throw error for unknown format');
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

Deno.test('SaleStatusService.parseSaleDate - 年跨ぎ対応テスト（試合日基準）', () => {
  const referenceDate = new Date(2024, 11, 15); // 2024年12月15日
  const matchDate = new Date('2025-03-20T14:00:00+09:00'); // 2025年3月の試合

  // 翌年3月の販売期間（試合日より前の販売開始日）
  const result = SaleStatusService.parseSaleDate('03/15(土)10:00〜', matchDate, referenceDate);

  assertEquals(result.saleStatus, 'before_sale');
  assertEquals(
    result.saleStartDate?.getUTCFullYear(),
    2025,
    '販売開始日の年は試合年と同じ（2025年）として設定されるべき',
  );
  assertEquals(result.saleStartDate?.getUTCMonth(), 2, '販売開始日の月は正しく設定されるべき');
  assertEquals(result.saleStartDate?.getUTCDate(), 15, 'JST 03/15 10:00 -> UTC 03/15 01:00'); // JST 3/15 10:00 -> UTC 3/15 01:00
});

Deno.test('SaleStatusService.parseSaleDate - 年跨ぎフルレンジテスト（試合日基準）', () => {
  const referenceDate = new Date(2024, 10, 15); // 2024年11月15日
  const matchDate = new Date('2025-03-20T14:00:00+09:00'); // 2025年3月の試合

  // 12月〜翌年3月の販売期間
  const result = SaleStatusService.parseSaleDate(
    '12/20(金)10:00〜03/15(土)23:59',
    matchDate,
    referenceDate,
  );

  assertEquals(result.saleStatus, 'before_sale');
  // 販売開始: 12月は試合年の前年
  assertEquals(result.saleStartDate?.getUTCFullYear(), 2024);
  assertEquals(result.saleStartDate?.getUTCMonth(), 11); // 12月 = 11 (0-indexed)

  // 販売終了: 3月は試合年と同じ
  assertEquals(result.saleEndDate?.getUTCFullYear(), 2025);
  assertEquals(result.saleEndDate?.getUTCMonth(), 2); // 3月 = 2 (0-indexed)
});

// 新しいロジックのテスト: 販売日が試合日より後になる場合は前年にする
Deno.test('SaleStatusService.parseSaleDate - 販売日が試合日より後の場合は前年にする', () => {
  const matchDate = new Date('2025-03-15T14:00:00+09:00'); // 2025年3月の試合
  const referenceDate = new Date(2024, 11, 15); // 2024年12月15日

  // 11月の販売開始日（試合と同じ年にすると試合より後になるため前年にする）
  const result = SaleStatusService.parseSaleDate('11/20(水)10:00〜', matchDate, referenceDate);

  assertEquals(result.saleStatus, 'before_sale');
  assertEquals(
    result.saleStartDate?.getUTCFullYear(),
    2024,
    '販売開始日が試合日より後になる場合は前年にするべき',
  );
  assertEquals(result.saleStartDate?.getUTCMonth(), 10); // 11月 = 10 (0-indexed)

  // 販売開始日 < 試合日 を確認
  if (result.saleStartDate && matchDate) {
    assertEquals(
      result.saleStartDate < matchDate,
      true,
      '販売開始日は試合日より前でなければならない',
    );
  }
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
