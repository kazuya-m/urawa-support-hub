import { assertEquals } from 'std/assert/mod.ts';
import { Ticket } from '../Ticket.ts';

Deno.test('Ticket hasSameBusinessData method', async (t) => {
  const baseProps = {
    id: 'test-ticket-001',
    matchName: 'Test Match',
    matchDate: new Date('2025-10-01T14:00:00Z'),
    homeTeam: 'Urawa',
    awayTeam: 'Away Team',
    competition: 'J1 League',
    saleStartDate: new Date('2025-09-10T10:00:00Z'),
    saleEndDate: new Date('2025-09-15T23:59:59Z'),
    venue: 'Test Stadium',
    ticketTypes: ['General', 'Premium'],
    ticketUrl: 'https://example.com',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    scrapedAt: new Date('2025-01-01T12:00:00Z'),
    saleStatus: 'before_sale' as const,
    notificationScheduled: false,
  };

  await t.step('null との比較では false を返す', () => {
    const ticket = Ticket.fromExisting(baseProps);
    assertEquals(ticket.hasSameBusinessData(null), false);
  });

  await t.step('完全に同じチケットでは true を返す', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting(baseProps);
    assertEquals(ticket1.hasSameBusinessData(ticket2), true);
  });

  await t.step('システム管理項目の違いは無視する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      createdAt: new Date('2025-01-02T00:00:00Z'), // 異なるcreatedAt
      updatedAt: new Date('2025-01-02T00:00:00Z'), // 異なるupdatedAt
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), true);
  });

  await t.step('scrapedAtの違いは無視する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      scrapedAt: new Date('2025-01-02T12:00:00Z'), // 異なるscrapedAt
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), true);
  });

  await t.step('すべてのシステム管理項目の違いは無視する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      createdAt: new Date('2025-01-02T00:00:00Z'), // 異なるcreatedAt
      updatedAt: new Date('2025-01-02T00:00:00Z'), // 異なるupdatedAt
      scrapedAt: new Date('2025-01-02T12:00:00Z'), // 異なるscrapedAt
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), true);
  });

  await t.step('ビジネスデータの違いは検知する - matchName', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      matchName: 'Different Match',
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('ビジネスデータの違いは検知する - saleStartDate', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      saleStartDate: new Date('2025-09-11T10:00:00Z'), // 1日違い
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('日付の時間まで正確に比較する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      matchDate: new Date('2025-10-01T14:01:00Z'), // 1分違い
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('配列の違いを検知する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      ticketTypes: ['General', 'VIP'], // Premium → VIP
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('配列の順序が異なる場合は違いとして検知する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      ticketTypes: ['Premium', 'General'], // 順序が逆
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('オプショナルプロパティの null と string の違いを検知する', () => {
    const ticket1 = Ticket.fromExisting({
      ...baseProps,
      homeTeam: null,
    });
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      homeTeam: 'Urawa Reds',
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('saleStatus の違いを検知する', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      saleStatus: 'on_sale' as const,
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), false);
  });

  await t.step('notificationScheduled の違いは無視される', () => {
    const ticket1 = Ticket.fromExisting(baseProps);
    const ticket2 = Ticket.fromExisting({
      ...baseProps,
      notificationScheduled: true,
    });
    assertEquals(ticket1.hasSameBusinessData(ticket2), true);
  });
});
