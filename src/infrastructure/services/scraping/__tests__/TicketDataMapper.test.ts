import { assertEquals, assertExists } from 'jsr:@std/assert';
import { TicketDataMapper } from '../transformation/components/TicketDataMapper.ts';
import { ValidatedTicketData } from '../types/ValidationResult.ts';

Deno.test('TicketDataMapper - createTicketEntity: 基本的な変換', async () => {
  const validatedData: ValidatedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024-05-15',
    saleDate: '2024-05-01',
    venue: 'さいたまスタジアム',
    ticketUrl: 'https://example.com',
    ticketTypes: ['一般', '指定席'],
  };

  const matchDate = new Date('2024-05-15');
  const saleStartDate = new Date('2024-05-01');

  const ticket = await TicketDataMapper.createTicketEntity(
    validatedData,
    matchDate,
    saleStartDate,
    '浦和レッズ',
    'FC東京',
  );

  assertExists(ticket);
  assertEquals(ticket.matchName, '浦和レッズ vs FC東京');
  assertEquals(ticket.venue, 'さいたまスタジアム');
  assertEquals(ticket.ticketUrl, 'https://example.com');
  assertEquals(ticket.homeTeam, '浦和レッズ');
  assertEquals(ticket.awayTeam, 'FC東京');
  assertEquals(ticket.matchDate.getTime(), matchDate.getTime());
  assertEquals(ticket.saleStartDate?.getTime(), saleStartDate.getTime());
});

Deno.test('TicketDataMapper - createTicketEntity: デフォルト値の処理', async () => {
  const validatedData: ValidatedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024-05-15',
    saleDate: '2024-05-01',
    // venue, ticketUrl, ticketTypes は未設定
  };

  const matchDate = new Date('2024-05-15');
  const saleStartDate = new Date('2024-05-01');

  const ticket = await TicketDataMapper.createTicketEntity(
    validatedData,
    matchDate,
    saleStartDate,
  );

  assertExists(ticket);
  assertEquals(ticket.venue, undefined);
  assertEquals(ticket.ticketUrl, undefined);
  assertEquals(ticket.ticketTypes.length, 0);
  assertEquals(ticket.homeTeam, undefined);
  assertEquals(ticket.awayTeam, undefined);
});
