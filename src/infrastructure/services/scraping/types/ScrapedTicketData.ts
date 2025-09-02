/**
 * J-Leagueサイトからスクレイピングで取得されるチケット情報
 * Infrastructure層の技術的な契約として定義
 */
export interface ScrapedTicketData {
  matchName: string;
  matchDate: string | null; // 試合日（取得できない場合はnull）
  saleDate: string | null; // 販売開始日時（詳細ページから取得、取得できない場合はnull）
  ticketTypes: string[];
  ticketUrl: string;
  venue: string;
  homeTeam: string | null; // ホームチーム（取得できない場合はnull）
  awayTeam: string | null; // アウェイチーム（取得できない場合はnull）
}
