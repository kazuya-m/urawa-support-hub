/**
 * 日時処理共通ユーティリティ
 * date-fns v4 + @date-fns/tz のタイムゾーンサポートを使用
 */

import { format, set, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { TZDate } from '@date-fns/tz';

const JST_TIMEZONE = 'Asia/Tokyo';

/**
 * JSTで指定された日時をUTC Dateオブジェクトとして作成
 * @param year 年
 * @param month 月 (1-12)
 * @param day 日
 * @param hour 時 (0-23)
 * @param minute 分 (0-59)
 * @param second 秒 (0-59)
 * @returns UTC時刻のDateオブジェクト
 */
export function createJSTDateTime(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0,
): Date {
  // TZDateでJST時刻を作成 (タイムゾーンは最後の引数)
  const tzDate = new TZDate(year, month - 1, day, hour, minute, second, 0, JST_TIMEZONE);
  return new Date(tzDate.getTime());
}

/**
 * UTC DateオブジェクトをJST時刻として表示用に取得
 * @param date UTC Dateオブジェクト
 * @returns JST時刻のDateオブジェクト（表示用）
 */
export function toJSTDate(date: Date): Date {
  // TZDateでJST時刻に変換
  return new TZDate(date, JST_TIMEZONE);
}

/**
 * 日時をJSTフォーマットで文字列化
 * @param date Dateオブジェクト
 * @param formatStr フォーマット文字列 (デフォルト: 'yyyy/MM/dd HH:mm')
 * @returns フォーマットされた文字列（日本語曜日対応）
 */
export function formatJST(date: Date, formatStr: string = 'yyyy/MM/dd HH:mm'): string {
  // JST時刻で表示するため、TZDateに変換してフォーマット
  const jstDate = new TZDate(date, JST_TIMEZONE);
  return format(jstDate, formatStr, { locale: ja });
}

/**
 * JSTで特定の時刻を設定してUTCに変換
 * @param baseDate 基準日時
 * @param hours 時 (0-23)
 * @param minutes 分 (0-59)
 * @param seconds 秒 (0-59)
 * @param daysOffset 日付オフセット（例: -1で前日）
 * @returns UTC Date
 */
export function setJSTTimeAndConvertToUTC(
  baseDate: Date,
  hours: number,
  minutes: number = 0,
  seconds: number = 0,
  daysOffset: number = 0,
): Date {
  // JST基準で計算
  const tzDate = new TZDate(baseDate, JST_TIMEZONE);

  // 日付オフセットを適用
  let targetDate = tzDate;
  if (daysOffset !== 0) {
    targetDate = new TZDate(subDays(tzDate, -daysOffset), JST_TIMEZONE);
  }

  // 時刻を設定（JST基準）
  const targetTime = new TZDate(
    set(targetDate, {
      hours,
      minutes,
      seconds,
      milliseconds: 0,
    }),
    JST_TIMEZONE,
  );

  // 通常のDateオブジェクトに変換して返す
  return new Date(targetTime.getTime());
}

/**
 * 現在時刻をUTC Dateとして取得
 * @returns 現在のUTC Date
 */
export function getCurrentTime(): Date {
  return new Date();
}

/**
 * 日付をyyyy-MM-dd形式の文字列として取得
 * @param date Dateオブジェクト
 * @returns yyyy-MM-dd形式の文字列
 */
export function formatDateOnly(date: Date): string {
  return formatJST(date, 'yyyy-MM-dd');
}

/**
 * デバッグ用: 日時を見やすくログ出力
 * @param label ラベル
 * @param date Dateオブジェクト
 */
export function logDateTime(label: string, date: Date): void {
  console.log(`${label}:`);
  console.log(`  UTC: ${date.toISOString()}`);
  console.log(`  JST: ${formatJST(date, 'yyyy-MM-dd HH:mm:ss zzz')}`);
  console.log(`  Timestamp: ${date.getTime()}`);
}
