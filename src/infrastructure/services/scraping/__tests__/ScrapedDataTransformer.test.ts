import { assertEquals, assertExists } from 'jsr:@std/assert';
import { ScrapedDataTransformer } from '../transformation/ScrapedDataTransformer.ts';
import { ScrapedTicketData } from '../types/ScrapedTicketData.ts';

Deno.test('ScrapedDataTransformer - 正常なデータの変換', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '2024-05-15',
      saleDate: '2024-05-01',
      venue: 'さいたまスタジアム',
      ticketUrl: 'https://example.com',
      ticketTypes: ['一般', '指定席'],
      homeTeam: null,
      awayTeam: null,
    },
  ];

  const tickets = await ScrapedDataTransformer.convertToTicketEntities(scrapedData);

  assertEquals(tickets.length, 1);
  assertExists(tickets[0]);
  assertEquals(tickets[0].matchName, '浦和レッズ vs FC東京');
  assertEquals(tickets[0].venue, 'さいたまスタジアム');
  assertEquals(tickets[0].ticketUrl, 'https://example.com');
});

Deno.test('ScrapedDataTransformer - 不完全なデータはスキップ', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '', // 必須データが空
      matchDate: '2024-05-15',
      saleDate: '2024-05-01',
      venue: '',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
    },
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '2024-05-15',
      saleDate: '2024-05-01',
      venue: 'さいたまスタジアム',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
    },
  ];

  const tickets = await ScrapedDataTransformer.convertToTicketEntities(scrapedData);

  assertEquals(tickets.length, 1);
  assertEquals(tickets[0].matchName, '浦和レッズ vs FC東京');
});

Deno.test('ScrapedDataTransformer - チーム名抽出とマッピング', async () => {
  const scrapedData: ScrapedTicketData[] = [
    {
      matchName: '浦和レッズ vs FC東京',
      matchDate: '2024-05-15',
      saleDate: '2024-05-01',
      venue: '',
      ticketUrl: '',
      ticketTypes: [],
      homeTeam: null,
      awayTeam: null,
    },
  ];

  const tickets = await ScrapedDataTransformer.convertToTicketEntities(scrapedData);

  assertEquals(tickets.length, 1);
  assertEquals(tickets[0].homeTeam, '浦和レッズ');
  assertEquals(tickets[0].awayTeam, 'FC東京');
});

Deno.test('ScrapedDataTransformer - 不正な日付フォーマットはスキップ', async () => {
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
    },
  ];

  const tickets = await ScrapedDataTransformer.convertToTicketEntities(scrapedData);

  assertEquals(tickets.length, 0);
});
