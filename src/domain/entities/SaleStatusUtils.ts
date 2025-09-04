export function determineSaleStatus(
  saleStartDate: Date | undefined,
  saleEndDate: Date | undefined,
  scrapedAt: Date,
): 'before_sale' | 'on_sale' | 'ended' {
  if (saleEndDate && scrapedAt > saleEndDate) {
    return 'ended';
  }

  if (saleStartDate && scrapedAt < saleStartDate) {
    return 'before_sale';
  }

  return 'on_sale';
}

export function parseSaleDate(saleText: string): {
  saleStartDate?: Date;
  saleEndDate?: Date;
  saleStatus: 'before_sale' | 'on_sale' | 'ended';
} {
  const currentYear = new Date().getFullYear();

  const beforeSalePattern = /^(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})〜$/;
  const onSalePattern = /^〜(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})$/;
  const fullRangePattern =
    /(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})〜(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})/;

  const beforeSaleMatch = saleText.match(beforeSalePattern);
  if (beforeSaleMatch) {
    const [, month, day, hour, minute] = beforeSaleMatch;
    const saleStartDate = new Date(
      currentYear,
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
    );
    return { saleStartDate, saleStatus: 'before_sale' };
  }

  const onSaleMatch = saleText.match(onSalePattern);
  if (onSaleMatch) {
    const [, month, day, hour, minute] = onSaleMatch;
    const saleEndDate = new Date(
      currentYear,
      parseInt(month) - 1,
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
    const saleStartDate = new Date(
      currentYear,
      parseInt(startMonth) - 1,
      parseInt(startDay),
      parseInt(startHour),
      parseInt(startMinute),
    );
    const saleEndDate = new Date(
      currentYear,
      parseInt(endMonth) - 1,
      parseInt(endDay),
      parseInt(endHour),
      parseInt(endMinute),
    );
    const now = new Date();
    const saleStatus = determineSaleStatus(saleStartDate, saleEndDate, now);
    return { saleStartDate, saleEndDate, saleStatus };
  }

  throw new Error(`Unknown sale date format: ${saleText}`);
}
