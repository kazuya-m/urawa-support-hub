import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';

/**
 * サイト固有データ抽出のインターフェース
 * 各サイトの低レベルスクレイピング処理を抽象化
 */
export interface IDataExtractor<TRawData> {
  /**
   * サイトから生データを抽出
   */
  extractTickets(page: IPage): Promise<TRawData[]>;

  /**
   * 単一チケット詳細の抽出
   */
  extractSingleTicket(page: IPage, containerSelector: string): Promise<TRawData | null>;

  /**
   * 抽出時の警告を取得
   */
  getAndClearWarnings(): string[];
}
