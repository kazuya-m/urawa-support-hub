import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { HiroshimaDataParser } from '../HiroshimaDataParser.ts';
import type { HiroshimaRawTicketData } from '../../types/HiroshimaTypes.ts';

Deno.test('HiroshimaDataParser', async (t) => {
  const parser = new HiroshimaDataParser();

  await t.step('サンフレッチェ広島の生データを正しいTicket形式に変換する', async () => {
    const rawTicketData: HiroshimaRawTicketData = {
      matchDate: '11.9',
      matchTime: '13:00',
      opponent: '浦和レッズ',
      venue: 'エディオンピースウイング広島',
      saleStatus: '販売中',
      ticketUrl: 'https://ticket.sanfrecce.co.jp/',
      saleDate: '10/10(金) 12:00～',
      ticketTypes: ['ビジター席'],
    };

    const tickets = await parser.parseMultipleToTickets([rawTicketData]);

    assertEquals(tickets.length, 1);
    const ticket = tickets[0];

    assertEquals(ticket.matchName, 'サンフレッチェ広島 vs 浦和レッズ');
    assertEquals(ticket.competition, 'J1リーグ');
    assertEquals(ticket.venue, 'エディオンピースウイング広島');
    assertEquals(ticket.saleStatus, 'on_sale');
    assertEquals(ticket.ticketUrl, 'https://ticket.sanfrecce.co.jp/');
    assertEquals(ticket.ticketTypes, ['ビジター席']);
    assertEquals(ticket.homeTeam, 'サンフレッチェ広島');
    assertEquals(ticket.awayTeam, '浦和レッズ');
    assertExists(ticket.matchDate);
    assertExists(ticket.saleStartDate);
    assertExists(ticket.scrapedAt);
  });

  await t.step('複数のチケットデータを処理する', async () => {
    const rawTickets: HiroshimaRawTicketData[] = [
      {
        matchDate: '11.9',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売中',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      },
      {
        matchDate: '12.15',
        matchTime: '14:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '完売',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      },
    ];

    const tickets = await parser.parseMultipleToTickets(rawTickets);

    assertEquals(tickets.length, 2);
    assertEquals(tickets[0].saleStatus, 'on_sale');
    assertEquals(tickets[1].saleStatus, 'sold_out');
  });

  await t.step('販売状況を正しくマップする', async () => {
    const testCases: Array<{ input: string; expected: string }> = [
      { input: '販売中', expected: 'on_sale' },
      { input: '発売中', expected: 'on_sale' },
      { input: '購入可能', expected: 'on_sale' },
      { input: '完売', expected: 'sold_out' },
      { input: '売り切れ', expected: 'sold_out' },
      { input: '全席種完売', expected: 'sold_out' },
      { input: '販売終了', expected: 'ended' },
      { input: '発売終了', expected: 'ended' },
      { input: '販売開始前', expected: 'before_sale' },
      { input: '発売前', expected: 'before_sale' },
    ];

    for (const testCase of testCases) {
      const rawTicketData: HiroshimaRawTicketData = {
        matchDate: '11.9',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: testCase.input,
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      };

      const tickets = await parser.parseMultipleToTickets([rawTicketData]);
      assertEquals(
        tickets[0].saleStatus,
        testCase.expected,
        `販売状況 "${testCase.input}" が "${testCase.expected}" にマップされない`,
      );
    }
  });

  await t.step('日付パース - 正常ケース', async () => {
    const testCases: Array<
      {
        date: string;
        time: string;
        expectedMonth: number;
        expectedDay: number;
        expectedHour: number;
      }
    > = [
      { date: '11.9', time: '13:00', expectedMonth: 11, expectedDay: 9, expectedHour: 13 },
      { date: '2.23', time: '14:00', expectedMonth: 2, expectedDay: 23, expectedHour: 14 },
      { date: '10.26', time: '19:00', expectedMonth: 10, expectedDay: 26, expectedHour: 19 },
    ];

    for (const testCase of testCases) {
      const rawTicketData: HiroshimaRawTicketData = {
        matchDate: testCase.date,
        matchTime: testCase.time,
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売中',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      };

      const tickets = await parser.parseMultipleToTickets([rawTicketData]);
      assertEquals(tickets.length, 1);

      const matchDate = tickets[0].matchDate;
      assertEquals(matchDate.getMonth() + 1, testCase.expectedMonth);
      assertEquals(matchDate.getDate(), testCase.expectedDay);
      assertEquals(matchDate.getHours(), testCase.expectedHour);
    }
  });

  await t.step('販売開始日のパース', async () => {
    const testCases: Array<
      { saleDate: string; expectedMonth: number; expectedDay: number; expectedHour: number }
    > = [
      { saleDate: '10/10(金) 12:00～', expectedMonth: 10, expectedDay: 10, expectedHour: 12 },
      { saleDate: '11/15(水) 15:30～', expectedMonth: 11, expectedDay: 15, expectedHour: 15 },
      { saleDate: '9/5(木) 09:00～', expectedMonth: 9, expectedDay: 5, expectedHour: 9 },
    ];

    for (const testCase of testCases) {
      const rawTicketData: HiroshimaRawTicketData = {
        matchDate: '11.9',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売中',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        saleDate: testCase.saleDate,
        ticketTypes: ['ビジター席'],
      };

      const tickets = await parser.parseMultipleToTickets([rawTicketData]);
      assertEquals(tickets.length, 1);

      const saleStartDate = tickets[0].saleStartDate;
      assertExists(saleStartDate);
      assertEquals(saleStartDate!.getMonth() + 1, testCase.expectedMonth);
      assertEquals(saleStartDate!.getDate(), testCase.expectedDay);
      assertEquals(saleStartDate!.getHours(), testCase.expectedHour);
    }
  });

  await t.step('大会名の正規化', async () => {
    const rawTicketData: HiroshimaRawTicketData = {
      matchDate: '11.9',
      matchTime: '13:00',
      opponent: '浦和レッズ',
      venue: 'エディオンピースウイング広島',
      saleStatus: '販売中',
      ticketUrl: 'https://ticket.sanfrecce.co.jp/',
      ticketTypes: ['ビジター席'],
      competition: '明治安田J1リーグ',
    };

    const tickets = await parser.parseMultipleToTickets([rawTicketData]);
    assertEquals(tickets[0].competition, 'J1リーグ');
  });

  await t.step('不正なデータの場合はnullを返す', async () => {
    const invalidRawTickets: HiroshimaRawTicketData[] = [
      // 不正な日付フォーマット
      {
        matchDate: '無効な日付',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売中',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      },
      // 時間なし
      {
        matchDate: '11.9',
        // matchTime なし
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売中',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      },
    ];

    const tickets = await parser.parseMultipleToTickets(invalidRawTickets);
    assertEquals(tickets.length, 0);
  });

  await t.step('販売開始日が不正な場合はnullになる', async () => {
    const rawTicketData: HiroshimaRawTicketData = {
      matchDate: '11.9',
      matchTime: '13:00',
      opponent: '浦和レッズ',
      venue: 'エディオンピースウイング広島',
      saleStatus: '販売中',
      ticketUrl: 'https://ticket.sanfrecce.co.jp/',
      saleDate: '不正な日付形式',
      ticketTypes: ['ビジター席'],
    };

    const tickets = await parser.parseMultipleToTickets([rawTicketData]);
    assertEquals(tickets.length, 1);
    assertEquals(tickets[0].saleStartDate, null);
  });

  await t.step('不明な販売状況の場合の処理', async () => {
    const rawTicketData: HiroshimaRawTicketData = {
      matchDate: '11.9',
      matchTime: '13:00',
      opponent: '浦和レッズ',
      venue: 'エディオンピースウイング広島',
      saleStatus: '不明な状況',
      ticketUrl: 'https://ticket.sanfrecce.co.jp/',
      ticketTypes: ['ビジター席'],
    };

    const tickets = await parser.parseMultipleToTickets([rawTicketData]);
    assertEquals(tickets.length, 1);
    // 不明な状況の場合、undefinedまたはデフォルト値が設定される
    const saleStatus = tickets[0].saleStatus;
    assertEquals(typeof saleStatus === 'string' || saleStatus === undefined, true);
  });
});
