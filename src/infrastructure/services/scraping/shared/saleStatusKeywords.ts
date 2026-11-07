/**
 * 販売状況テキストの判定キーワード（スクレイピングソース共通）
 *
 * 判定はテキストへのキーワード部分一致で行う。どのグループをどの順で評価するかは利用側が決める
 * （広島: soldOut → ended → onSale → beforeSale、Jリーグ: soldOut → ended のみ）。
 */
export const SALE_STATUS_KEYWORDS = {
  soldOut: ['完売', '売り切れ', '全席種完売'],
  ended: ['販売終了', '発売終了', '終了'],
  onSale: ['販売中', '発売中', 'WEBで購入', '購入可能'],
  beforeSale: ['販売開始前', '発売前', '販売予定'],
} as const;
