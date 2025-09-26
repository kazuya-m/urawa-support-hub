import { createJSTDateTime, toJSTDate } from '@/shared/utils/datetime.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';

/**
 * J-Leagueシーズンを考慮した年判定ロジック
 * シーズンは2月〜翌年1月として処理
 */
export function determineYear(month: number, referenceDate: Date = new Date()): number {
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
export function createMatchDateFromJST(
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  referenceDate: Date = new Date(),
): Date {
  const year = determineYear(month, referenceDate);

  // date-fns-tzを使用してJST→UTC変換
  const utcDate = createJSTDateTime(year, month, day, hour, minute);

  if (isNaN(utcDate.getTime())) {
    throw new Error(`Invalid date: ${year}/${month}/${day} ${hour}:${minute}`);
  }

  return utcDate;
}

export function determineSaleStatus(
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

export function parseSaleDate(
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
    const saleStartDate = createMatchDateFromJST(
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
    const saleEndDate = createMatchDateFromJST(
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
    const saleStartDate = createMatchDateFromJST(
      parseInt(startMonth),
      parseInt(startDay),
      parseInt(startHour),
      parseInt(startMinute),
      referenceDate,
    );
    const saleEndDate = createMatchDateFromJST(
      parseInt(endMonth),
      parseInt(endDay),
      parseInt(endHour),
      parseInt(endMinute),
      referenceDate,
    );
    const saleStatus = determineSaleStatus(saleStartDate, saleEndDate, referenceDate);
    return { saleStartDate, saleEndDate, saleStatus };
  }

  throw new Error(`Unknown sale date format: ${saleText}`);
}
