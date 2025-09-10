import { ScrapedTicketData } from '@/infrastructure/services/scraping/types/ScrapedTicketData.ts';

/**
 * チケットスクレーピングサービスのインターフェース
 * 各チケットサイト（J-League、その他）のスクレーパーが実装
 */
export interface ITicketScraper {
  /**
   * チケット情報をスクレーピングして取得
   * @returns スクレーピングされたチケットデータの配列
   */
  scrapeTickets(): Promise<ScrapedTicketData[]>;
}
