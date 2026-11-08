/**
 * チケットサイトの販売状況表示を判定するためのキーワード
 * 各サイトのパーサーが共通で使う。サイト固有の表記は各パーサー側で追加する
 */
export const SALE_STATUS_KEYWORDS = {
  soldOut: ['完売', '売り切れ', '全席種完売'],
  ended: ['販売終了', '発売終了', '終了'],
  onSale: ['販売中', '発売中', 'WEBで購入', '購入可能'],
  beforeSale: ['販売開始前', '発売前', '販売予定'],
} as const satisfies Record<string, readonly string[]>;
