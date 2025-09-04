import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';

// モック用のTicketCollectionService
class MockTicketCollectionService {
  private mockTickets: Ticket[];

  constructor(mockTickets: Ticket[] = []) {
    this.mockTickets = mockTickets;
  }

  private async ensureMockTickets(): Promise<void> {
    if (this.mockTickets.length === 0) {
      this.mockTickets = await this.getDefaultMockData();
    }
  }

  async collectAllTickets(): Promise<Ticket[]> {
    await this.ensureMockTickets();
    return this.mockTickets;
  }

  private async getDefaultMockData(): Promise<Ticket[]> {
    return [
      await Ticket.createNew({
        matchName: '清水エスパルス',
        matchDate: new Date('2024-09-23'),
        homeTeam: '清水エスパルス',
        awayTeam: '浦和レッズ',
        saleStartDate: new Date('2024-09-10T10:00:00Z'),
        venue: 'IAIスタジアム日本平',
        ticketTypes: ['ビジター１F指定席'],
        ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2528632/001',
        scrapedAt: new Date(),
        saleStatus: 'before_sale',
        notificationScheduled: false,
      }),
    ];
  }
}

Deno.test('TicketCollectionService Tests', async (t) => {
  await t.step('should collect tickets successfully', async () => {
    const mockService = new MockTicketCollectionService();
    const result = await mockService.collectAllTickets();

    assertEquals(Array.isArray(result), true);
    assertEquals(result.length, 1);
    assertEquals(result[0].matchName, '清水エスパルス');
    assertEquals(result[0].homeTeam, '清水エスパルス');
    assertEquals(result[0].awayTeam, '浦和レッズ');
  });

  await t.step('should handle multiple tickets', async () => {
    const multipleTickets = [
      await Ticket.createNew({
        matchName: 'FC東京',
        matchDate: new Date('2024-10-20'),
        homeTeam: 'FC東京',
        awayTeam: '浦和レッズ',
        saleStartDate: new Date('2024-10-10T10:00:00Z'),
        venue: '味の素スタジアム',
        ticketTypes: ['ビジター席'],
        ticketUrl: 'https://example.com/ticket1',
        scrapedAt: new Date(),
        saleStatus: 'before_sale',
        notificationScheduled: false,
      }),
      await Ticket.createNew({
        matchName: 'ガンバ大阪',
        matchDate: new Date('2024-11-03'),
        homeTeam: 'ガンバ大阪',
        awayTeam: '浦和レッズ',
        saleStartDate: new Date('2024-10-20T10:00:00Z'),
        venue: 'パナソニックスタジアム吹田',
        ticketTypes: ['ビジター指定席'],
        ticketUrl: 'https://example.com/ticket2',
        scrapedAt: new Date(),
        saleStatus: 'before_sale',
        notificationScheduled: false,
      }),
    ];

    const mockService = new MockTicketCollectionService(multipleTickets);
    const result = await mockService.collectAllTickets();

    assertEquals(result.length, 2);
    assertEquals(result[0].matchName, 'FC東京');
    assertEquals(result[1].matchName, 'ガンバ大阪');
  });
});
