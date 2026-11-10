/**
 * 通知サービス設定のユニットテスト
 */

import { assertEquals } from 'std/assert/mod.ts';
import { LINE_MESSAGE_TEMPLATES } from '../notification.ts';

Deno.test('LINE_MESSAGE_TEMPLATES', async (t) => {
  await t.step('simple template should create text message', () => {
    const message = LINE_MESSAGE_TEMPLATES.simple('テストメッセージ');

    assertEquals(message.type, 'text');
    assertEquals(message.text, 'テストメッセージ');
  });

  await t.step('ticketNotification template should create flex message', () => {
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      '浦和レッズ vs FC東京',
      '2024-03-15 19:00',
      '味の素スタジアム',
      '2024-03-01 10:00',
      'day_before',
      'https://example.com/ticket',
    );

    assertEquals(message.type, 'flex');
    assertEquals(message.altText, '【チケット販売通知】浦和レッズ vs FC東京');
    assertEquals(message.contents.type, 'bubble');
    assertEquals(message.contents.body.type, 'box');
    assertEquals(message.contents.body.layout, 'vertical');

    // フッターにボタンが含まれていることを確認
    assertEquals(message.contents.footer?.type, 'box');
    assertEquals(message.contents.footer?.contents[0].type, 'button');
  });

  await t.step('ticketNotification template should work without URL', () => {
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      '浦和レッズ vs FC東京',
      '2024-03-15 19:00',
      '味の素スタジアム',
      '2024-03-01 10:00',
      'day_before',
    );

    assertEquals(message.contents.footer, undefined);
  });

  await t.step('ticketNotification template should have correct colors', () => {
    const message = LINE_MESSAGE_TEMPLATES.ticketNotification(
      'Test Match',
      '2024-03-15',
      'Test Venue',
      '2024-03-01',
      'day_before',
    );

    const headerContents = message.contents.header.contents;
    assertEquals(headerContents[0].color, '#00C851'); // day_beforeの色
    assertEquals(message.contents.header.backgroundColor, '#FFFFFF');

    const bodyContents = message.contents.body.contents;
    const saleStartText = bodyContents.find((c: unknown) =>
      typeof c === 'object' && c !== null && 'text' in c &&
      typeof c.text === 'string' && c.text.includes('販売開始:')
    );
    assertEquals((saleStartText as { color?: string })?.color, '#00C851'); // day_beforeの色
  });
});
