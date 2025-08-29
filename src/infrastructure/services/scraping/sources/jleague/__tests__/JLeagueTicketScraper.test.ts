import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { MockJLeagueTicketScraper } from './MockJLeagueTicketScraper.ts';

Deno.test('JLeagueTicketScraper Tests', async (t) => {
  await t.step('should scrape away tickets successfully', async () => {
    const scraper = new MockJLeagueTicketScraper();
    const tickets = await scraper.scrapeTickets();

    assertEquals(tickets.length, 3);

    // 最初のチケット検証
    const firstTicket = tickets[0];
    assertEquals(firstTicket.matchName, '清水エスパルス');
    assertEquals(firstTicket.venue, 'IAIスタジアム日本平');
    assertEquals(firstTicket.ticketTypes.length, 2);
  });

  await t.step('should handle partial data with default values', async () => {
    const scraper = new MockJLeagueTicketScraper();
    const tickets = await scraper.scrapeTickets();

    // 販売日未定のケース
    const secondTicket = tickets[1];
    assertEquals(secondTicket.saleDate, '未定');
    assertEquals(secondTicket.matchName, 'ガンバ大阪');

    // 試合日未定のケース
    const thirdTicket = tickets[2];
    assertEquals(thirdTicket.matchDate, '未定');
    assertEquals(thirdTicket.matchName, '横浜F・マリノス');
  });

  await t.step('should return custom mock data', async () => {
    const customData = [
      {
        matchName: 'FC東京',
        matchDate: '2024-10-20',
        saleDate: '2024-10-10 10:00',
        venue: '味の素スタジアム',
        ticketUrl: 'https://example.com/ticket',
        ticketTypes: ['ビジター席'],
      },
    ];

    const scraper = new MockJLeagueTicketScraper(customData);
    const tickets = await scraper.scrapeTickets();

    assertEquals(tickets.length, 1);
    assertEquals(tickets[0].matchName, 'FC東京');
  });

  await t.step('should throw error when configured to fail', async () => {
    const scraper = new MockJLeagueTicketScraper([], true);

    let errorThrown = false;
    try {
      await scraper.scrapeTickets();
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, 'Mock J-League scraping error');
    }

    assertEquals(errorThrown, true);
  });

  await t.step('should return empty array when no data available', async () => {
    const scraper = new MockJLeagueTicketScraper([], false);
    const tickets = await scraper.scrapeTickets();

    assertEquals(tickets.length, 3); // デフォルトデータが返される
  });
});
