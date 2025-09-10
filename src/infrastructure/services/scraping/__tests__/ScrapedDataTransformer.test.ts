import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { ScrapedDataTransformer } from '../transformation/ScrapedDataTransformer.ts';
import { ScrapedTicketData } from '../types/ScrapedTicketData.ts';

Deno.test('ScrapedDataTransformer - 正常なデータの変換', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '5/15',
      saleDate: '〜05/01(水)21:00',
      venue: 'さいたまスタジアム',
      ticketUrl: 'https://example.com',
      ticketTypes: ['一般', '指定席'],
      homeTeam: null,
      awayTeam: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
    },
  ];

  const result = await ScrapedDataTransformer.transform(scrapedData);

  assertEquals(result.tickets.length, 1);
  assertEquals(result.skippedTickets.length, 0);
  assertExists(result.tickets[0]);
  assertEquals(result.tickets[0].matchName, '浦和レッズ vs FC東京');
  assertEquals(result.tickets[0].venue, 'さいたまスタジアム');
  assertEquals(result.tickets[0].ticketUrl, 'https://example.com');
});

Deno.test('ScrapedDataTransformer - 不完全なデータはスキップ', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '', // 必須データが空
      matchDate: '5/15',
      saleDate: '〜05/01(水)21:00',
      venue: '',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
    },
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '5/15',
      saleDate: '〜05/01(水)21:00',
      venue: 'さいたまスタジアム',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
    },
  ];

  const result = await ScrapedDataTransformer.transform(scrapedData);

  assertEquals(result.tickets.length, 1);
  assertEquals(result.tickets[0].matchName, '浦和レッズ vs FC東京');
});

Deno.test('ScrapedDataTransformer - チーム名抽出とマッピング', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '5/15',
      saleDate: '〜05/01(水)21:00',
      venue: '',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
    },
  ];

  const result = await ScrapedDataTransformer.transform(scrapedData);

  assertEquals(result.tickets.length, 1);
  assertEquals(result.tickets[0].homeTeam, '浦和レッズ');
  assertEquals(result.tickets[0].awayTeam, 'FC東京');
});

Deno.test('ScrapedDataTransformer - 不正な日付フォーマットでも警告付きで処理', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: 'invalid-date',
      saleDate: '2024-05-01',
      venue: '',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
    },
  ];

  const result = await ScrapedDataTransformer.transform(scrapedData);

  assertEquals(result.tickets.length, 1); // エラー耐性でチケット作成
  assertEquals(result.skippedTickets.length, 0);
  assertEquals(result.warningCount > 0, true); // 警告は発生
  assertEquals(result.tickets[0].matchName, '浦和レッズ vs FC東京');
});
