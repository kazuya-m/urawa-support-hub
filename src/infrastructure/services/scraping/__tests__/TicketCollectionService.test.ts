import { assertEquals } from 'std/assert/mod.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketCollectionService } from '../TicketCollectionService.ts';
import type { ISiteScrapingService } from '@/infrastructure/services/scraping/shared/interfaces/index.ts';

function createTicket(matchName: string): Promise<Ticket> {
  return Ticket.createNew({
    matchName,
    matchDate: new Date('2024-10-20'),
    homeTeam: matchName,
    awayTeam: '浦和レッズ',
    competition: 'J1リーグ',
    saleStartDate: new Date('2024-10-10T10:00:00Z'),
    saleEndDate: null,
    venue: null,
    ticketTypes: ['ビジター席'],
    ticketUrl: null,
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });
}

/**
 * 指定したチケットを返す（Error を渡すと reject する）サイト別スクレイピングサービスのスタブ
 */
function siteStub(serviceName: string, result: Ticket[] | Error) {
  return {
    serviceName,
    collectTickets: () =>
      result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  } satisfies ISiteScrapingService;
}

Deno.test('TicketCollectionService.collectAllTickets', async (t) => {
  await t.step('サイトがなければ空配列を返す', async () => {
    const service = new TicketCollectionService([]);

    assertEquals(await service.collectAllTickets(), []);
  });

  await t.step('全サイトの結果をサイトの順に結合して返す', async () => {
    const shimizu = await createTicket('清水エスパルス');
    const tokyo = await createTicket('FC東京');
    const gamba = await createTicket('ガンバ大阪');
    const service = new TicketCollectionService([
      siteStub('site-a', [shimizu]),
      siteStub('site-b', [tokyo, gamba]),
    ]);

    const result = await service.collectAllTickets();

    assertEquals(result.map((ticket) => ticket.matchName), [
      '清水エスパルス',
      'FC東京',
      'ガンバ大阪',
    ]);
  });

  await t.step('1 サイトが失敗しても、他サイトの結果を返す', async () => {
    const tokyo = await createTicket('FC東京');
    const service = new TicketCollectionService([
      siteStub('failing-site', new Error('scraping failed')),
      siteStub('site-b', [tokyo]),
    ]);

    const result = await service.collectAllTickets();

    assertEquals(result.map((ticket) => ticket.matchName), ['FC東京']);
  });
});
