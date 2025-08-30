/**
 * モックTicketCollectionService
 * 実際のスクレイピングは行わず、UseCaseからの呼び出しを確認
 */

import { TicketCollectionResult } from '@/infrastructure/services/scraping/TicketCollectionService.ts';

export class MockTicketCollectionService {
  private callCount = 0;

  async collectAllTickets(): Promise<TicketCollectionResult> {
    this.callCount++;
    console.log(
      `🎯 MockTicketCollectionService.collectAllTickets() called (count: ${this.callCount})`,
    );

    // 成功レスポンスを返す
    return {
      success: true,
      totalTickets: 3,
      sourceResults: [
        {
          source: 'J-League Ticket (Mock)',
          ticketsFound: 3,
          success: true,
        },
      ],
      errors: [],
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }
}
