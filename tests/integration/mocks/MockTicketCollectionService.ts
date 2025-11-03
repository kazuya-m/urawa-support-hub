/**
 * モックTicketCollectionService
 * 実際のスクレイピングは行わず、UseCaseからの呼び出しを確認
 */

import { Ticket } from '@/domain/entities/Ticket.ts';

export class MockTicketCollectionService {
  private callCount = 0;

  async collectAllTickets(): Promise<Ticket[]> {
    this.callCount++;
    console.log(
      `🎯 MockTicketCollectionService.collectAllTickets() called (count: ${this.callCount})`,
    );

    // モックチケットデータを返す
    const mockTickets: Ticket[] = [
      Ticket.fromExisting({
        id: 'mock-1',
        matchName: '浦和レッズ vs セレッソ大阪',
        matchDate: new Date('2024-12-15T14:00:00+09:00'),
        homeTeam: 'セレッソ大阪',
        awayTeam: '浦和レッズ',
        competition: 'J1リーグ',
        venue: '大阪府吹田市',
        saleStartDate: new Date('2024-12-01T10:00:00+09:00'),
        saleEndDate: null,
        ticketTypes: ['アウェイ指定席'],
        ticketUrl: 'https://example.com/ticket1',
        createdAt: new Date(),
        updatedAt: new Date(),
        scrapedAt: new Date(),
        saleStatus: 'before_sale',
        notificationScheduled: false,
      }),
      Ticket.fromExisting({
        id: 'mock-2',
        matchName: '浦和レッズ vs ヴィッセル神戸',
        matchDate: new Date('2024-12-22T14:00:00+09:00'),
        homeTeam: 'ヴィッセル神戸',
        awayTeam: '浦和レッズ',
        competition: 'J1リーグ',
        venue: '兵庫県神戸市',
        saleStartDate: new Date('2024-12-08T10:00:00+09:00'),
        saleEndDate: null,
        ticketTypes: ['アウェイ自由席'],
        ticketUrl: 'https://example.com/ticket2',
        createdAt: new Date(),
        updatedAt: new Date(),
        scrapedAt: new Date(),
        saleStatus: 'before_sale',
        notificationScheduled: false,
      }),
    ];

    return mockTickets;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }
}
