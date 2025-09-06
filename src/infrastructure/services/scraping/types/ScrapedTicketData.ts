/**
 * J-Leagueサイトからスクレイピングで取得されるチケット情報
 * Infrastructure層の技術的な契約として定義
 */
export interface ScrapedTicketData {
  matchName: string;
  matchDate: string | null; // 試合日（取得できない場合はnull）
  saleDate: string | null; // 販売開始日時（詳細ページから取得、取得できない場合はnull）
  saleEndDate?: string | null; // 販売終了日時（販売中の場合に存在）
  ticketTypes: string[];
  ticketUrl: string;
  venue: string;
  homeTeam: string | null; // ホームチーム（取得できない場合はnull）
  awayTeam: string | null; // アウェイチーム（取得できない場合はnull）
  scrapedAt: Date; // スクレイピング実行時刻
  saleStatus?: 'before_sale' | 'on_sale' | 'ended'; // 販売状態（スクレイピング失敗時はundefined）
}
