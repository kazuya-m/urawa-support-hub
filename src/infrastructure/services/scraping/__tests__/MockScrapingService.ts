import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';
import { ScrapingConfig } from '@/infrastructure/config/types/ScrapingConfig.ts';
import { UrlConfig } from '@/infrastructure/config/types/UrlConfig.ts';

/**
 * テスト用モックスクレイピングサービス
 * Playwrightの実際のブラウザ起動なしでテスト可能
 */
export class MockScrapingService {
  constructor(
    private config: ScrapingConfig,
    private urlConfig: UrlConfig,
  ) {}

  scrapeAwayTickets(): Promise<ScrapedTicketData[]> {
    // モックデータを返す
    return Promise.resolve([
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
        saleDate: '2024-09-01 10:00',
        venue: 'パナソニック　スタジアム　吹田',
        ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2527755/001',
        ticketTypes: ['アウェイ指定席', 'アウェイ自由席'],
      },
      {
        matchName: '横浜F・マリノス',
        matchDate: '2024-10-18',
        saleDate: '2024-10-05 10:00',
        venue: '日産スタジアム',
        ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2529547/001',
        ticketTypes: ['ビジターゴール裏', 'ビジター指定席'],
      },
    ]);
  }

  // プライベートメソッドのテスト用公開
  isAwayTicket(ticket: ScrapedTicketData): boolean {
    // 1. チケット種別名でのアウェイ判定（最優先）
    const ticketTypesText = ticket.ticketTypes.join(' ').toLowerCase();
    const hasAwayKeyword = this.config.awayKeywords.some((keyword) =>
      ticketTypesText.includes(keyword.toLowerCase())
    );

    if (hasAwayKeyword) {
      return true;
    }

    // 2. 試合名でのアウェイ判定（企画チケット等）
    const matchNameLower = ticket.matchName.toLowerCase();
    const matchHasAwayKeyword = this.config.awayKeywords.some((keyword) =>
      matchNameLower.includes(keyword.toLowerCase())
    );

    if (matchHasAwayKeyword) {
      return true;
    }

    // 3. 会場がアウェイスタジアムかどうかの判定
    const venue = ticket.venue.toLowerCase();
    const isAwayVenue = !venue.includes('埼玉スタジアム') &&
      !venue.includes('さいたま') &&
      venue.length > 0;

    // アウェイ会場の場合は、チケット種別に関係なくアウェイ試合として扱う
    // ただし、駐車券や企画チケットなど特殊なもの以外
    if (isAwayVenue && !this.isSpecialTicket(ticket)) {
      return true;
    }

    return false;
  }

  private isSpecialTicket(ticket: ScrapedTicketData): boolean {
    const matchNameLower = ticket.matchName.toLowerCase();
    const ticketTypesText = ticket.ticketTypes.join(' ').toLowerCase();

    const specialKeywords = [
      '駐車券',
      '駐車',
      '企画チケット',
      '車椅子',
      '障がい者',
      'parking',
    ];

    return specialKeywords.some((keyword) =>
      matchNameLower.includes(keyword.toLowerCase()) ||
      ticketTypesText.includes(keyword.toLowerCase())
    );
  }

  filterAwayTickets(tickets: ScrapedTicketData[]): ScrapedTicketData[] {
    return tickets.filter((ticket) => this.isAwayTicket(ticket));
  }
}
