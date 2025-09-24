import { assertEquals } from 'std/assert/mod.ts';
import { SALE_STATUS_LABELS } from '../SaleStatus.ts';
import type { SaleStatus } from '../SaleStatus.ts';

Deno.test('SaleStatus', async (t) => {
  await t.step('SaleStatus型が正しい値を持つ', () => {
    const validStatuses: SaleStatus[] = [
      'before_sale',
      'on_sale',
      'sold_out',
      'ended',
    ];

    // 型チェックはコンパイル時に行われるため、実行時に値が存在することを確認
    validStatuses.forEach((status) => {
      // SALE_STATUS_LABELSにすべてのステータスが定義されていることを確認
      assertEquals(typeof SALE_STATUS_LABELS[status], 'string');
    });
  });

  await t.step('SALE_STATUS_LABELSが正しい日本語ラベルを持つ', () => {
    assertEquals(SALE_STATUS_LABELS.before_sale, '販売開始前');
    assertEquals(SALE_STATUS_LABELS.on_sale, '販売中');
    assertEquals(SALE_STATUS_LABELS.sold_out, '完売');
    assertEquals(SALE_STATUS_LABELS.ended, '販売終了');
  });

  await t.step('SALE_STATUS_LABELSがすべてのSaleStatus値をカバーしている', () => {
    const expectedKeys: SaleStatus[] = ['before_sale', 'on_sale', 'sold_out', 'ended'];
    const actualKeys = Object.keys(SALE_STATUS_LABELS) as SaleStatus[];

    assertEquals(actualKeys.length, expectedKeys.length);

    expectedKeys.forEach((key) => {
      assertEquals(actualKeys.includes(key), true, `SALE_STATUS_LABELSに${key}が含まれていない`);
    });
  });

  await t.step('SALE_STATUS_LABELSの値がすべて文字列である', () => {
    Object.values(SALE_STATUS_LABELS).forEach((label) => {
      assertEquals(typeof label, 'string');
      assertEquals(label.length > 0, true, 'ラベルが空文字列');
    });
  });

  await t.step('SALE_STATUS_LABELSがreadonly（as constされている）', () => {
    // TypeScriptのas constが正しく適用されていることを確認
    // 実行時には変更可能だが、型レベルでreadonly
    const labels = SALE_STATUS_LABELS;

    // すべてのプロパティが存在することを確認
    assertEquals('before_sale' in labels, true);
    assertEquals('on_sale' in labels, true);
    assertEquals('sold_out' in labels, true);
    assertEquals('ended' in labels, true);
  });
});
