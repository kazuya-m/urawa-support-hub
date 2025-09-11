import { Ticket } from '@/domain/entities/Ticket.ts';

/**
 * サイト固有データパーサーのインターフェース
 * 生データから統一されたTicketオブジェクトへの変換を抽象化
 */
export interface IDataParser<TRawData> {
  /**
   * 生データを統一されたTicketに変換
   * @param rawData サイト固有の生データ
   * @param referenceDate 年跨ぎ処理用の基準日時
   */
  parseToTicket(rawData: TRawData, referenceDate?: Date): Promise<Ticket>;

  /**
   * 複数データの一括変換
   */
  parseMultipleToTickets(rawData: TRawData[], referenceDate?: Date): Promise<Ticket[]>;
}
