import { ScrapingService } from './ScrapingService.ts';
import { URAWA_SCRAPING_CONFIG } from '@/config/scraping-config.ts';
import { URAWA_URL_CONFIG } from '@/config/url-config.ts';
import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';

/**
 * 浦和レッズ専用スクレイピングサービス
 * 実際の設定を使用してJ-Leagueチケットサイトをスクレイピング
 */
export class UrawaScrapingService extends ScrapingService {
  constructor() {
    super(URAWA_SCRAPING_CONFIG, URAWA_URL_CONFIG);
  }

  /**
   * 浦和レッズのアウェイチケット情報を取得
   */
  async scrapeUrawaAwayTickets(): Promise<ScrapedTicketData[]> {
    try {
      console.log('浦和レッズアウェイチケットスクレイピング開始');
      const tickets = await this.scrapeAwayTickets();

      console.log(`取得したアウェイチケット数: ${tickets.length}`);
      tickets.forEach((ticket) => {
        console.log(`- ${ticket.matchName} @${ticket.venue} (${ticket.saleDate})`);
      });

      return tickets;
    } catch (error) {
      console.error('アウェイチケットスクレイピングエラー:', error);
      throw error;
    }
  }

  /**
   * 試合情報の詳細ログ出力
   */
  private logTicketDetails(tickets: ScrapedTicketData[]): void {
    tickets.forEach((ticket, index) => {
      console.log(`\n=== 試合 ${index + 1} ===`);
      console.log(`試合名: ${ticket.matchName}`);
      console.log(`試合日: ${ticket.matchDate}`);
      console.log(`販売日: ${ticket.saleDate}`);
      console.log(`会場: ${ticket.venue}`);
      console.log(`チケット種別: ${ticket.ticketTypes.join(', ')}`);
      console.log(`購入URL: ${ticket.ticketUrl}`);
    });
  }
}

/**
 * スクレイピングサービスのファクトリー関数
 * テスト環境と本番環境で異なる設定を使用可能
 */
export function createScrapingService(): UrawaScrapingService {
  return new UrawaScrapingService();
}
