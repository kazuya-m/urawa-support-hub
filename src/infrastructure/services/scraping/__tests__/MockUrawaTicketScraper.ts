import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';

/**
 * テスト用モック浦和チケットスクレイパー
 * Playwrightの実際のブラウザ起動なしでテスト可能
 */
export class MockUrawaTicketScraper {
  private mockData: ScrapedTicketData[];
  private shouldThrow: boolean;

  constructor(
    mockData: ScrapedTicketData[] = [],
    shouldThrow = false,
  ) {
    this.mockData = mockData.length > 0 ? mockData : this.getDefaultMockData();
    this.shouldThrow = shouldThrow;
  }

  async scrapeTickets(): Promise<ScrapedTicketData[]> {
    if (this.shouldThrow) {
      throw new Error('Mock scraping error');
    }

    // 非同期処理をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 10));

    return this.mockData;
  }

  private getDefaultMockData(): ScrapedTicketData[] {
    return [
      {
        matchName: '清水エスパルス',
        matchDate: '2024-09-23',
        saleDate: '2024-09-10 10:00',
        venue: 'IAIスタジアム日本平',
        ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2528632/001',
        ticketTypes: ['ビジター１F指定席', 'ビジター２F自由席'],
      },
      {
        matchName: 'ガンバ大阪',
        matchDate: '2024-09-13',
        saleDate: '未定', // 販売日未定のケース
        venue: 'パナソニック　スタジアム　吹田',
        ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2527755/001',
        ticketTypes: ['アウェイ指定席', 'アウェイ自由席'],
      },
      {
        matchName: '横浜F・マリノス',
        matchDate: '未定', // 試合日未定のケース
        saleDate: '2024-10-05 10:00',
        venue: '日産スタジアム',
        ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2529547/001',
        ticketTypes: ['ビジターゴール裏', 'ビジター指定席'],
      },
    ];
  }
}
