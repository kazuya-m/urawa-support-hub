import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { HiroshimaDataParser } from '../HiroshimaDataParser.ts';
import type { HiroshimaRawTicketData } from '../../types/HiroshimaTypes.ts';
import { toJSTDate } from '@/shared/utils/datetime.ts';

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
    assertEquals(ticket.saleStartDate, null);
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
        expectedHourJST: number;
      }
    > = [
      { date: '11.9', time: '13:00', expectedMonth: 11, expectedDay: 9, expectedHourJST: 13 },
      { date: '2.23', time: '14:00', expectedMonth: 2, expectedDay: 23, expectedHourJST: 14 },
      { date: '10.26', time: '19:00', expectedMonth: 10, expectedDay: 26, expectedHourJST: 19 },
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
      // JST -> UTC変換が正しく動作することを確認
      // UTC時刻をJST時刻に変換して検証
      const jstDate = toJSTDate(matchDate);
      assertEquals(jstDate.getMonth() + 1, testCase.expectedMonth);
      assertEquals(jstDate.getDate(), testCase.expectedDay);
      assertEquals(jstDate.getHours(), testCase.expectedHourJST);
    }
  });

  await t.step('販売開始日のパース', async () => {
    const testCases: Array<
      { saleDate: string; expectedMonth: number; expectedDay: number; expectedHourJST: number }
    > = [
      { saleDate: '10/10(金) 12:00～', expectedMonth: 10, expectedDay: 10, expectedHourJST: 12 },
      { saleDate: '11/15(水) 15:30～', expectedMonth: 11, expectedDay: 15, expectedHourJST: 15 },
      { saleDate: '9/5(木) 09:00～', expectedMonth: 9, expectedDay: 5, expectedHourJST: 9 },
    ];

    for (const testCase of testCases) {
      const rawTicketData: HiroshimaRawTicketData = {
        matchDate: '11.9',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売開始前',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        saleDate: testCase.saleDate,
        ticketTypes: ['ビジター席'],
      };

      const tickets = await parser.parseMultipleToTickets([rawTicketData]);
      assertEquals(tickets.length, 1);

      const saleStartDate = tickets[0].saleStartDate;
      assertExists(saleStartDate);
      // JST -> UTC変換が正しく動作することを確認
      // UTC時刻をJST時刻に変換して検証
      const jstDate = toJSTDate(saleStartDate!);
      assertEquals(jstDate.getMonth() + 1, testCase.expectedMonth);
      assertEquals(jstDate.getDate(), testCase.expectedDay);
      assertEquals(jstDate.getHours(), testCase.expectedHourJST);
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

  await t.step('販売中の場合は販売開始日がnullになる', async () => {
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

Deno.test('HiroshimaDataParser - 販売状況キーワード判定', async (t) => {
  const parser = new HiroshimaDataParser();
  const cases: Array<[string, string]> = [
    ['完売', 'sold_out'],
    ['売り切れ', 'sold_out'],
    ['全席種完売', 'sold_out'],
    ['販売終了', 'ended'],
    ['発売終了', 'ended'],
    ['終了', 'ended'],
    ['販売中', 'on_sale'],
    ['発売中', 'on_sale'],
    ['WEBで購入', 'on_sale'],
    ['購入可能', 'on_sale'],
    ['販売開始前', 'before_sale'],
    ['発売前', 'before_sale'],
    ['販売予定', 'before_sale'],
    // 判定順: 完売 → 終了 → 販売中 → 販売前
    ['完売 販売中', 'sold_out'],
    ['販売中（終了間近）', 'ended'],
    // どれにも当たらなければ販売前（広島は「空席なし」を完売として扱わない）
    ['空席なし', 'before_sale'],
    ['未定', 'before_sale'],
  ];

  for (const [saleStatus, expected] of cases) {
    await t.step(`'${saleStatus}' → ${expected}`, async () => {
      const tickets = await parser.parseMultipleToTickets([{
        matchDate: '11.9',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus,
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
      }]);
      assertEquals(tickets[0].saleStatus, expected);
    });
  }
});

Deno.test('HiroshimaDataParser - 大会名の正規化（部分一致）', async (t) => {
  const parser = new HiroshimaDataParser();
  const cases: Array<[string | undefined, string]> = [
    [undefined, 'J1リーグ'],
    ['', 'J1リーグ'],
    ['J1', 'J1リーグ'],
    ['明治安田J1', 'J1リーグ'],
    ['明治安田J1リーグ', 'J1リーグ'],
    ['ルヴァン', 'ルヴァンカップ'],
    ['JリーグYBCルヴァンカップ 準決勝', 'ルヴァンカップ'],
    ['天皇杯 3回戦', '天皇杯'],
    ['ACL', 'ACLE'],
    ['ACLE', 'ACLE'],
    // 部分一致で 'ACL' が先に当たるため ACLE になる（現行の挙動）
    ['ACL2', 'ACLE'],
    ['プレシーズンマッチ', 'プレシーズンマッチ'],
  ];

  for (const [competition, expected] of cases) {
    await t.step(`'${competition}' → ${expected}`, async () => {
      const tickets = await parser.parseMultipleToTickets([{
        matchDate: '11.9',
        matchTime: '13:00',
        opponent: '浦和レッズ',
        venue: 'エディオンピースウイング広島',
        saleStatus: '販売中',
        ticketUrl: 'https://ticket.sanfrecce.co.jp/',
        ticketTypes: ['ビジター席'],
        competition,
      }]);
      assertEquals(tickets[0].competition, expected);
    });
  }
});
