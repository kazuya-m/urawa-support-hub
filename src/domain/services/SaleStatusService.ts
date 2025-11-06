import type { SaleStatus } from '@/domain/types/SaleStatus.ts';
import { DateCalculationService } from './DateCalculationService.ts';

/**
 * 販売状況管理ドメインサービス
 * チケット販売日時の解析と状況判定を行う
 */
export class SaleStatusService {
  /**
   * 販売開始日・終了日・現在時刻から販売状況を判定
   */
  static determineSaleStatus(
    saleStartDate: Date | undefined,
    saleEndDate: Date | undefined,
    scrapedAt: Date,
  ): SaleStatus {
    if (saleEndDate && scrapedAt > saleEndDate) {
      return 'ended';
    }

    if (saleStartDate && scrapedAt < saleStartDate) {
      return 'before_sale';
    }

    return 'on_sale';
  }

  /**
   * 販売日時テキストをパースして日付と状況を返す
   *
   * @param saleText - 販売日時テキスト（例: "11/06(水)10:00〜"）
   * @param matchDate - 試合日（販売日の年を決定するために使用）
   * @param referenceDate - 現在日時（デフォルト: new Date()）
   */
  static parseSaleDate(
    saleText: string,
    matchDate: Date,
    referenceDate: Date = new Date(),
  ): {
    saleStartDate?: Date;
    saleEndDate?: Date;
    saleStatus: SaleStatus;
  } {
    const beforeSalePattern = /^(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})〜$/;
    const onSalePattern = /^〜(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})$/;
    const fullRangePattern =
      /(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})〜(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})/;

    const beforeSaleMatch = saleText.match(beforeSalePattern);
    if (beforeSaleMatch) {
      const [, month, day, hour, minute] = beforeSaleMatch;
      const saleStartDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
      );
      return { saleStartDate, saleStatus: 'before_sale' };
    }

    const onSaleMatch = saleText.match(onSalePattern);
    if (onSaleMatch) {
      const [, month, day, hour, minute] = onSaleMatch;
      const saleEndDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
      );
      return { saleEndDate, saleStatus: 'on_sale' };
    }

    const fullRangeMatch = saleText.match(fullRangePattern);
    if (fullRangeMatch) {
      const [, startMonth, startDay, startHour, startMinute, endMonth, endDay, endHour, endMinute] =
        fullRangeMatch;
      const saleStartDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(startMonth),
        parseInt(startDay),
        parseInt(startHour),
        parseInt(startMinute),
      );
      const saleEndDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(endMonth),
        parseInt(endDay),
        parseInt(endHour),
        parseInt(endMinute),
      );
      const saleStatus = this.determineSaleStatus(saleStartDate, saleEndDate, referenceDate);
      return { saleStartDate, saleEndDate, saleStatus };
    }

    throw new Error(`Unknown sale date format: ${saleText}`);
  }

  /**
   * 試合日を基準に販売日を作成
   * 販売日は試合日より前でなければならないため、試合日より後になる場合は前年にする
   */
  private static createSaleDateFromMatchDate(
    matchDate: Date,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): Date {
    const matchYear = matchDate.getFullYear();

    // まず試合と同じ年で販売日を作成
    const saleDate = DateCalculationService.createMatchDateFromJST(
      month,
      day,
      hour,
      minute,
      new Date(matchYear, 0, 1), // 試合年の1月1日を基準日として使用
    );

    // 販売日が試合日より後になる場合は前年にする
    if (saleDate > matchDate) {
      return DateCalculationService.createMatchDateFromJST(
        month,
        day,
        hour,
        minute,
        new Date(matchYear - 1, 0, 1), // 前年の1月1日を基準日として使用
      );
    }

    return saleDate;
  }
}
