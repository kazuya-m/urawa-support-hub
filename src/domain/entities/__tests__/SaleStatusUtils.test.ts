import { assertEquals } from 'std/assert/mod.ts';
import {
  determineSaleStatus,
  determineYear,
  parseMatchDate,
  parseSaleDate,
} from '../SaleStatusUtils.ts';

Deno.test('determineSaleStatus should return correct status based on dates', () => {
  const baseTime = new Date('2024-08-15T12:00:00Z');

  const saleStartDate = new Date('2024-08-16T10:00:00Z');
  const saleEndDate = new Date('2024-09-12T23:59:00Z');

  assertEquals(
    determineSaleStatus(saleStartDate, undefined, baseTime),
    'before_sale',
    'Should be before_sale when current time is before sale start',
  );

  const duringTime = new Date('2024-08-20T12:00:00Z');
  assertEquals(
    determineSaleStatus(saleStartDate, saleEndDate, duringTime),
    'on_sale',
    'Should be on_sale when current time is between start and end',
  );

  const afterTime = new Date('2024-09-13T12:00:00Z');
  assertEquals(
    determineSaleStatus(saleStartDate, saleEndDate, afterTime),
    'ended',
    'Should be ended when current time is after sale end',
  );

  const noStartTime = new Date('2024-08-10T12:00:00Z');
  assertEquals(
    determineSaleStatus(undefined, saleEndDate, noStartTime),
    'on_sale',
    'Should default to on_sale when no start date is provided',
  );
});

Deno.test('parseSaleDate should parse before_sale format correctly', () => {
  const beforeSaleText = '08/15(金)10:00〜';
  const result = parseSaleDate(beforeSaleText);

  assertEquals(result.saleStatus, 'before_sale');
  assertEquals(result.saleStartDate?.getMonth(), 7); // August (0-indexed)
  assertEquals(result.saleStartDate?.getDate(), 15);
  assertEquals(result.saleStartDate?.getHours(), 10);
  assertEquals(result.saleStartDate?.getMinutes(), 0);
  assertEquals(result.saleEndDate, undefined);
});

Deno.test('parseSaleDate should parse on_sale format correctly', () => {
  const onSaleText = '〜09/12(金)23:59';
  const result = parseSaleDate(onSaleText);

  assertEquals(result.saleStatus, 'on_sale');
  assertEquals(result.saleStartDate, undefined);
  assertEquals(result.saleEndDate?.getMonth(), 8); // September (0-indexed)
  assertEquals(result.saleEndDate?.getDate(), 12);
  assertEquals(result.saleEndDate?.getHours(), 23);
  assertEquals(result.saleEndDate?.getMinutes(), 59);
});

Deno.test('parseSaleDate should parse full range format correctly', () => {
  const fullRangeText = '08/15(金)10:00〜09/12(金)23:59';
  const result = parseSaleDate(fullRangeText);

  assertEquals(result.saleStartDate?.getMonth(), 7); // August
  assertEquals(result.saleStartDate?.getDate(), 15);
  assertEquals(result.saleEndDate?.getMonth(), 8); // September
  assertEquals(result.saleEndDate?.getDate(), 12);

  assertEquals(typeof result.saleStatus, 'string');
  assertEquals(['before_sale', 'on_sale', 'ended'].includes(result.saleStatus!), true);
});

Deno.test('parseSaleDate should throw error for unknown format', () => {
  let errorThrown = false;
  try {
    parseSaleDate('Unknown format');
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
  const result = determineYear(3, currentDate); // 3月
  assertEquals(result, 2025, '12月実行時の3月データは翌年として判定されるべき');
});

Deno.test('determineYear - 1月実行時の前年11月データ', () => {
  const currentDate = new Date(2025, 0, 15); // 2025年1月15日
  const result = determineYear(11, currentDate); // 11月
  assertEquals(result, 2024, '1月実行時の11月データは前年として判定されるべき（前シーズンの延長）');
});

Deno.test('determineYear - 8月実行時の翌年3月データ', () => {
  const currentDate = new Date(2025, 7, 15); // 2025年8月15日
  const result = determineYear(3, currentDate); // 3月
  assertEquals(result, 2026, '8月実行時の3月データは翌年として判定されるべき');
});

Deno.test('determineYear - 通常シーズン内', () => {
  const currentDate = new Date(2025, 6, 15); // 2025年7月15日
  const result = determineYear(9, currentDate); // 9月
  assertEquals(result, 2025, '通常シーズン内は同年として判定されるべき');
});

Deno.test('parseMatchDate - 年跨ぎ対応', () => {
  const referenceDate = new Date(2024, 11, 15); // 2024年12月15日

  // 翌年3月の試合
  const marchMatch = parseMatchDate(3, 15, 14, 0, referenceDate);
  assertEquals(marchMatch.getFullYear(), 2025, '12月実行時の3月試合は翌年として処理');
  assertEquals(marchMatch.getMonth(), 2, '月は正しく設定されるべき'); // 3月 = 2 (0-indexed)
  assertEquals(marchMatch.getDate(), 15, '日は正しく設定されるべき');
  assertEquals(marchMatch.getHours(), 14, '時刻は正しく設定されるべき');
});

Deno.test('parseSaleDate - 年跨ぎ対応テスト', () => {
  const referenceDate = new Date(2024, 11, 15); // 2024年12月15日

  // 翌年3月の販売期間
  const result = parseSaleDate('03/15(土)10:00〜', referenceDate);

  assertEquals(result.saleStatus, 'before_sale');
  assertEquals(
    result.saleStartDate?.getFullYear(),
    2025,
    '販売開始日の年は翌年として設定されるべき',
  );
  assertEquals(result.saleStartDate?.getMonth(), 2, '販売開始日の月は正しく設定されるべき');
  assertEquals(result.saleStartDate?.getDate(), 15, '販売開始日の日は正しく設定されるべき');
});

Deno.test('parseSaleDate - 年跨ぎフルレンジテスト', () => {
  const referenceDate = new Date(2024, 10, 15); // 2024年11月15日

  // 12月〜翌年3月の販売期間
  const result = parseSaleDate('12/20(金)10:00〜03/15(土)23:59', referenceDate);

  assertEquals(result.saleStatus, 'before_sale');
  // 販売開始: 12月なので同年
  assertEquals(result.saleStartDate?.getFullYear(), 2024);
  assertEquals(result.saleStartDate?.getMonth(), 11); // 12月 = 11 (0-indexed)

  // 販売終了: 3月なので翌年
  assertEquals(result.saleEndDate?.getFullYear(), 2025);
  assertEquals(result.saleEndDate?.getMonth(), 2); // 3月 = 2 (0-indexed)
});
