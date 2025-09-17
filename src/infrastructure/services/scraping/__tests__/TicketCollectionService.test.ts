import { assertEquals, assertStringIncludes } from 'std/assert/mod.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketCollectionService } from '../TicketCollectionService.ts';

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

Deno.test('TicketCollectionService Test Mode Tests', async (t) => {
  const originalEnvValue = Deno.env.get('ENABLE_TEST_TICKET');
  const originalRescheduleValue = Deno.env.get('ENABLE_TEST_RESCHEDULE');

  // クリーンアップ関数
  const cleanup = () => {
    if (originalEnvValue !== undefined) {
      Deno.env.set('ENABLE_TEST_TICKET', originalEnvValue);
    } else {
      Deno.env.delete('ENABLE_TEST_TICKET');
    }
    if (originalRescheduleValue !== undefined) {
      Deno.env.set('ENABLE_TEST_RESCHEDULE', originalRescheduleValue);
    } else {
      Deno.env.delete('ENABLE_TEST_RESCHEDULE');
    }
  };

  await t.step('should not generate test tickets when test mode is disabled', async () => {
    try {
      Deno.env.delete('ENABLE_TEST_TICKET');
      const service = new TicketCollectionService([]);
      const result = await service.collectAllTickets();

      assertEquals(result.length, 0);
      assertEquals(result.filter((ticket) => ticket.matchName.includes('[TEST]')).length, 0);
    } finally {
      cleanup();
    }
  });

  await t.step('should generate test ticket when test mode is enabled', async () => {
    try {
      Deno.env.set('ENABLE_TEST_TICKET', 'true');
      const service = new TicketCollectionService([]);
      const result = await service.collectAllTickets();

      assertEquals(result.length, 1);
      assertStringIncludes(result[0].matchName, '[TEST]');
      assertEquals(result[0].homeTeam, '川崎フロンターレ');
      assertEquals(result[0].awayTeam, '浦和レッズ');
      assertEquals(result[0].venue, '等々力陸上競技場');
      assertEquals(result[0].ticketTypes.includes('ビジター指定席大人'), true);
      assertEquals(result[0].saleStatus, 'before_sale');
      assertEquals(result[0].notificationScheduled, false);

      // 販売開始日が明日10:00に設定されているかチェック
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      assertEquals(result[0].saleStartDate?.getDate(), tomorrow.getDate());
      assertEquals(result[0].saleStartDate?.getHours(), 10);
    } finally {
      cleanup();
    }
  });

  await t.step(
    'should generate additional reschedule test ticket when both modes are enabled',
    async () => {
      try {
        Deno.env.set('ENABLE_TEST_TICKET', 'true');
        Deno.env.set('ENABLE_TEST_RESCHEDULE', 'true');
        const service = new TicketCollectionService([]);
        const result = await service.collectAllTickets();

        assertEquals(result.length, 2);

        const baseTestTicket = result.find((ticket) =>
          ticket.matchName.includes('[TEST]') && !ticket.matchName.includes('RESCHEDULE')
        );
        const rescheduleTestTicket = result.find((ticket) =>
          ticket.matchName.includes('[TEST-RESCHEDULE]')
        );

        assertEquals(!!baseTestTicket, true);
        assertEquals(!!rescheduleTestTicket, true);
        assertEquals(rescheduleTestTicket?.awayTeam, '浦和レッズ');
        assertEquals(rescheduleTestTicket?.homeTeam, '川崎フロンターレ');

        // 再スケジュール用チケットの販売開始日が2時間前に設定されているかチェック
        if (
          baseTestTicket && rescheduleTestTicket && baseTestTicket.saleStartDate &&
          rescheduleTestTicket.saleStartDate
        ) {
          const timeDifference = baseTestTicket.saleStartDate.getTime() -
            rescheduleTestTicket.saleStartDate.getTime();
          assertEquals(timeDifference, 2 * 60 * 60 * 1000); // 2時間の差
        }
      } finally {
        cleanup();
      }
    },
  );
});
