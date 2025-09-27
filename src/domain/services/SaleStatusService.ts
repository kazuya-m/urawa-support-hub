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
   */
  static parseSaleDate(
    saleText: string,
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
      const saleStartDate = DateCalculationService.createMatchDateFromJST(
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        referenceDate,
      );
      return { saleStartDate, saleStatus: 'before_sale' };
    }

    const onSaleMatch = saleText.match(onSalePattern);
    if (onSaleMatch) {
      const [, month, day, hour, minute] = onSaleMatch;
      const saleEndDate = DateCalculationService.createMatchDateFromJST(
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        referenceDate,
      );
      return { saleEndDate, saleStatus: 'on_sale' };
    }

    const fullRangeMatch = saleText.match(fullRangePattern);
    if (fullRangeMatch) {
      const [, startMonth, startDay, startHour, startMinute, endMonth, endDay, endHour, endMinute] =
        fullRangeMatch;
      const saleStartDate = DateCalculationService.createMatchDateFromJST(
        parseInt(startMonth),
        parseInt(startDay),
        parseInt(startHour),
        parseInt(startMinute),
        referenceDate,
      );
      const saleEndDate = DateCalculationService.createMatchDateFromJST(
        parseInt(endMonth),
        parseInt(endDay),
        parseInt(endHour),
        parseInt(endMinute),
        referenceDate,
      );
      const saleStatus = this.determineSaleStatus(saleStartDate, saleEndDate, referenceDate);
      return { saleStartDate, saleEndDate, saleStatus };
    }

    throw new Error(`Unknown sale date format: ${saleText}`);
  }
}
