import { assertEquals } from 'std/assert/mod.ts';
import {
  createJSTDateTime,
  formatDateOnly,
  formatJST,
  logDateTime,
  setJSTTimeAndConvertToUTC,
  toJSTDate,
} from '../datetime.ts';

Deno.test('createJSTDateTime - JST時刻をUTC Dateとして作成', () => {
  // 2025年3月15日 14:00 JST を作成
  const result = createJSTDateTime(2025, 3, 15, 14, 0, 0);

  // UTC時刻は JST-9時間 = 5:00 UTC
  assertEquals(result.getUTCFullYear(), 2025);
  assertEquals(result.getUTCMonth(), 2); // 0-indexed
  assertEquals(result.getUTCDate(), 15);
  assertEquals(result.getUTCHours(), 5);
  assertEquals(result.getUTCMinutes(), 0);
  assertEquals(result.getUTCSeconds(), 0);
});

Deno.test('createJSTDateTime - デフォルト値（時刻指定なし）', () => {
  // 時刻指定なしの場合は 00:00 JST
  const result = createJSTDateTime(2025, 1, 1);

  // 1月1日 00:00 JST = 12月31日 15:00 UTC
  assertEquals(result.getUTCFullYear(), 2024);
  assertEquals(result.getUTCMonth(), 11); // December
  assertEquals(result.getUTCDate(), 31);
  assertEquals(result.getUTCHours(), 15);
});

Deno.test('toJSTDate - UTC DateをJST時刻として取得', () => {
  // UTC時刻を作成
  const utcDate = new Date(Date.UTC(2025, 2, 15, 5, 0, 0)); // 2025-03-15 05:00 UTC

  const jstDate = toJSTDate(utcDate);

  // JST = UTC+9
  assertEquals(jstDate.getFullYear(), 2025);
  assertEquals(jstDate.getMonth(), 2); // March
  assertEquals(jstDate.getDate(), 15);
  assertEquals(jstDate.getHours(), 14); // 5 + 9 = 14
  assertEquals(jstDate.getMinutes(), 0);
});

Deno.test('formatJST - 日時をJSTフォーマットで文字列化', () => {
  const utcDate = new Date(Date.UTC(2025, 2, 15, 5, 30, 0));

  const formatted = formatJST(utcDate);

  assertEquals(formatted, '2025/03/15 14:30');
});

Deno.test('formatJST - カスタムフォーマット', () => {
  const utcDate = new Date(Date.UTC(2025, 2, 15, 5, 30, 45));

  const formatted = formatJST(utcDate, 'yyyy-MM-dd HH:mm:ss');

  assertEquals(formatted, '2025-03-15 14:30:45');
});

Deno.test('setJSTTimeAndConvertToUTC - 前日20:00を設定', () => {
  // 販売開始日: 2025年3月15日 10:00 JST
  const saleStartDate = createJSTDateTime(2025, 3, 15, 10, 0);

  // 前日20:00に設定
  const result = setJSTTimeAndConvertToUTC(saleStartDate, 20, 0, 0, -1);

  // 期待値: 2025年3月14日 20:00 JST = 3月14日 11:00 UTC
  assertEquals(result.getUTCFullYear(), 2025);
  assertEquals(result.getUTCMonth(), 2); // March
  assertEquals(result.getUTCDate(), 14);
  assertEquals(result.getUTCHours(), 11);
  assertEquals(result.getUTCMinutes(), 0);
});

Deno.test('setJSTTimeAndConvertToUTC - 当日の時刻変更', () => {
  const baseDate = createJSTDateTime(2025, 3, 15, 10, 0);

  // 同日の18:30に設定
  const result = setJSTTimeAndConvertToUTC(baseDate, 18, 30, 0, 0);

  // 期待値: 2025年3月15日 18:30 JST = 9:30 UTC
  assertEquals(result.getUTCFullYear(), 2025);
  assertEquals(result.getUTCMonth(), 2);
  assertEquals(result.getUTCDate(), 15);
  assertEquals(result.getUTCHours(), 9);
  assertEquals(result.getUTCMinutes(), 30);
});

Deno.test('setJSTTimeAndConvertToUTC - 翌日設定', () => {
  const baseDate = createJSTDateTime(2025, 3, 15, 10, 0);

  // 翌日の8:00に設定 (daysOffset = 1 means tomorrow)
  const result = setJSTTimeAndConvertToUTC(baseDate, 8, 0, 0, 1);

  // 期待値: 2025年3月16日 8:00 JST = 3月15日 23:00 UTC
  assertEquals(result.getUTCFullYear(), 2025);
  assertEquals(result.getUTCMonth(), 2);
  assertEquals(result.getUTCDate(), 15);
  assertEquals(result.getUTCHours(), 23);
  assertEquals(result.getUTCMinutes(), 0);
});

Deno.test('logDateTime - デバッグ出力（実行のみ確認）', () => {
  const date = createJSTDateTime(2025, 3, 15, 14, 30);

  // エラーが発生しないことを確認
  let errorThrown = false;
  try {
    // console.logを一時的に無効化
    const originalLog = console.log;
    console.log = () => {};

    logDateTime('Test Date', date);

    // console.logを復元
    console.log = originalLog;
  } catch {
    errorThrown = true;
  }

  assertEquals(errorThrown, false);
});

Deno.test('日付境界値のテスト - 月末から翌月初', () => {
  // 3月31日 23:00 JST
  const endOfMonth = createJSTDateTime(2025, 3, 31, 23, 0);

  // UTC: 3月31日 14:00
  assertEquals(endOfMonth.getUTCMonth(), 2);
  assertEquals(endOfMonth.getUTCDate(), 31);
  assertEquals(endOfMonth.getUTCHours(), 14);

  // 4月1日 01:00 JST
  const startOfMonth = createJSTDateTime(2025, 4, 1, 1, 0);

  // UTC: 3月31日 16:00
  assertEquals(startOfMonth.getUTCMonth(), 2); // Still March in UTC
  assertEquals(startOfMonth.getUTCDate(), 31);
  assertEquals(startOfMonth.getUTCHours(), 16);
});

Deno.test('年末年始の境界値テスト', () => {
  // 2025年1月1日 00:00 JST
  const newYear = createJSTDateTime(2025, 1, 1, 0, 0);

  // UTC: 2024年12月31日 15:00
  assertEquals(newYear.getUTCFullYear(), 2024);
  assertEquals(newYear.getUTCMonth(), 11); // December
  assertEquals(newYear.getUTCDate(), 31);
  assertEquals(newYear.getUTCHours(), 15);
});

Deno.test('formatDateOnly - 日付のみをyyyy-MM-dd形式で取得', () => {
  const utcDate = new Date(Date.UTC(2025, 2, 15, 5, 30, 0));

  const formatted = formatDateOnly(utcDate);

  assertEquals(formatted, '2025-03-15');
});
