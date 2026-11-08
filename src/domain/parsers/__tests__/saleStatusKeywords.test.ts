import { assertEquals } from 'std/assert/mod.ts';
import { SALE_STATUS_KEYWORDS } from '../saleStatusKeywords.ts';

Deno.test('SALE_STATUS_KEYWORDS - 各ステータスのキーワード', () => {
  assertEquals(SALE_STATUS_KEYWORDS.soldOut, ['完売', '売り切れ', '全席種完売']);
  assertEquals(SALE_STATUS_KEYWORDS.ended, ['販売終了', '発売終了', '終了']);
  assertEquals(SALE_STATUS_KEYWORDS.onSale, ['販売中', '発売中', 'WEBで購入', '購入可能']);
  assertEquals(SALE_STATUS_KEYWORDS.beforeSale, ['販売開始前', '発売前', '販売予定']);
});
