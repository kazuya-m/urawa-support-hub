import { createJSTDateTime, toJSTDate } from '@/shared/utils/datetime.ts';

/**
 * J-Leagueシーズンを考慮した日付計算ドメインサービス
 * シーズンは2月〜翌年1月として処理
 */
export class DateCalculationService {
  /**
   * J-Leagueシーズンを考慮した年判定ロジック
   */
  static determineYear(month: number, referenceDate: Date = new Date()): number {
    // date-fns-tzを使用してJST時刻で判定
    const jstReferenceDate = toJSTDate(referenceDate);
    const currentYear = jstReferenceDate.getFullYear();
    const currentMonth = jstReferenceDate.getMonth() + 1;

    if (currentMonth >= 11 && month <= 6) {
      return currentYear + 1;
    } else if (currentMonth <= 2 && month >= 11) {
      return currentYear - 1;
    } else if (currentMonth <= 2 && month >= 7 && month <= 10) {
      return currentYear;
    } else if (month < currentMonth && currentMonth >= 3) {
      return currentYear + 1;
    }

    return currentYear;
  }

  /**
   * 年跨ぎ対応の日付作成関数
   * JST（日本標準時）をUTCに変換して返す
   */
  static createMatchDateFromJST(
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
    referenceDate: Date = new Date(),
  ): Date {
    const year = this.determineYear(month, referenceDate);

    // date-fns-tzを使用してJST→UTC変換
    const utcDate = createJSTDateTime(year, month, day, hour, minute);

    if (isNaN(utcDate.getTime())) {
      throw new Error(`Invalid date: ${year}/${month}/${day} ${hour}:${minute}`);
    }

    return utcDate;
  }
}
