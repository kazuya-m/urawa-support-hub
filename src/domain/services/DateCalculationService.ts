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
    // JST時刻で判定
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
   * 試合日を基準に販売日の年を決定
   *
   * ビジネスルール: 販売日は試合日より前でなければならない
   * - 販売日（月日）が試合日より後の場合 → 前年として判定
   * - 販売日（月日）が試合日以前の場合 → 同年として判定
   *
   * @param matchDate - 試合日（年が確定している）
   * @param saleMonth - 販売日の月（1-12）
   * @param saleDay - 販売日の日
   * @returns 推定された販売日の年
   *
   * @example
   * // 2025年3月の試合に対して11月の販売開始日
   * determineSaleYear(new Date('2025-03-15'), 11, 20) // => 2024
   *
   * // 2025年9月の試合に対して8月の販売開始日
   * determineSaleYear(new Date('2025-09-15'), 8, 15) // => 2025
   */
  static determineSaleYear(matchDate: Date, saleMonth: number, saleDay: number): number {
    const matchYear = matchDate.getFullYear();
    const matchMonth = matchDate.getMonth() + 1; // 0-11 to 1-12
    const matchDay = matchDate.getDate();

    // 日付を比較用のキーに変換（例: 3月15日 = 315, 11月20日 = 1120）
    const saleDateKey = saleMonth * 100 + saleDay;
    const matchDateKey = matchMonth * 100 + matchDay;

    // 販売日が試合日より後の「日付」になる場合は前年にする
    // 同じ日の場合は時刻が異なっても同年とする（例：試合18:00、販売終了23:59）
    if (saleDateKey > matchDateKey) {
      return matchYear - 1;
    }

    return matchYear;
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

    // JST→UTC変換
    const utcDate = createJSTDateTime(year, month, day, hour, minute);

    if (isNaN(utcDate.getTime())) {
      throw new Error(`Invalid date: ${year}/${month}/${day} ${hour}:${minute}`);
    }

    return utcDate;
  }
}
