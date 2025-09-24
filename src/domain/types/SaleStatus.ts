/**
 * チケット販売状況の型定義
 */
export type SaleStatus = 'before_sale' | 'on_sale' | 'sold_out' | 'ended';

/**
 * 販売状況の日本語表示名
 */
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  before_sale: '販売開始前',
  on_sale: '販売中',
  sold_out: '完売',
  ended: '販売終了',
} as const;
