import { Ticket } from '@/domain/entities/Ticket.ts';

/**
 * サイト固有スクレイピングサービスのインターフェース
 * Clean Architecture + DI対応
 */
export interface ISiteScrapingService {
  /**
   * サイト固有の処理を内部で実行し、統一されたTicket[]を返す
   */
  collectTickets(): Promise<Ticket[]>;

  /**
   * サービス名（ログ・デバッグ用）
   */
  readonly serviceName: string;
}
