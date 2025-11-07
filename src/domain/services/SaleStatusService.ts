import type { SaleStatus } from '@/domain/types/SaleStatus.ts';

/**
 * 販売状況管理ドメインサービス
 * 販売開始日・終了日・現在時刻から販売状況を判定
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
}
