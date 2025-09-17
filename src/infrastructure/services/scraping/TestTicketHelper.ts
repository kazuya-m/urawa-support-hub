import { Ticket } from '@/domain/entities/Ticket.ts';

/**
 * 本番環境フローテスト用ヘルパー
 * テスト完了後にファイル削除で一括除去可能
 */
export class TestTicketHelper {
  /**
   * テストモードが有効かチェック
   */
  static isTestModeEnabled(): boolean {
    return Deno.env.get('ENABLE_TEST_TICKET') === 'true';
  }

  /**
   * 本番環境フローテスト用ダミーチケット生成
   * 明日10:00販売開始のテストチケットで3つの通知タイミングをテスト
   * ENABLE_TEST_RESCHEDULE=true で販売開始日変更テストも実行
   */
  static async generateTestTickets(): Promise<Ticket[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 明日10:00

    const matchDate = new Date(tomorrow);
    matchDate.setDate(matchDate.getDate() + 14); // 試合は2週間後

    // 基本的なテストチケット（実データに近い形式）
    const baseTicket = await Ticket.createNew({
      matchName: '[TEST] 川崎フロンターレ vs 浦和レッズ',
      matchDate,
      homeTeam: '川崎フロンターレ',
      awayTeam: '浦和レッズ',
      competition: 'J1リーグ',
      saleStartDate: tomorrow,
      venue: '等々力陸上競技場',
      ticketTypes: ['ビジター指定席大人', 'ビジター指定席小中'],
      ticketUrl: 'https://www.jleague-ticket.jp/test/perform/2528632/001',
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
      notificationScheduled: false,
    });

    const tickets = [baseTicket];

    // 再スケジューリングテストモード
    if (Deno.env.get('ENABLE_TEST_RESCHEDULE') === 'true') {
      // 販売開始日を2時間前に変更したチケット（再スケジューリングテスト用）
      const rescheduledSaleStart = new Date(tomorrow);
      rescheduledSaleStart.setHours(rescheduledSaleStart.getHours() - 2);

      const rescheduledTicket = await Ticket.createNew({
        matchName: '[TEST-RESCHEDULE] 川崎フロンターレ vs 浦和レッズ',
        matchDate,
        homeTeam: '川崎フロンターレ',
        awayTeam: '浦和レッズ',
        competition: 'J1リーグ',
        saleStartDate: rescheduledSaleStart,
        venue: '等々力陸上競技場',
        ticketTypes: ['ビジター指定席大人', 'ビジター指定席小中'],
        ticketUrl: 'https://www.jleague-ticket.jp/test/perform/2528632/001',
        scrapedAt: new Date(),
        saleStatus: 'before_sale',
        notificationScheduled: false,
      });

      tickets.push(rescheduledTicket);
    }

    return tickets;
  }
}
