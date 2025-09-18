import { Ticket } from '@/domain/entities/Ticket.ts';
import { createJSTDateTime, toJSTDate } from '@/shared/utils/datetime.ts';

/**
 * 本番環境フローテスト用ヘルパー
 * テスト完了後にファイル削除で一括除去可能
 */
export class TestTicketHelper {
  /**
   * テストモードが有効かチェック
   */
  static isTestModeEnabled(): boolean {
    const value = Deno.env.get('ENABLE_TEST_TICKET');
    console.log(`🔍 ENABLE_TEST_TICKET: "${value}" (type: ${typeof value})`);
    return value === 'true';
  }

  /**
   * 本番環境フローテスト用ダミーチケット生成
   * 明日10:00販売開始のテストチケットで3つの通知タイミングをテスト
   * ENABLE_TEST_RESCHEDULE=true で販売開始日変更テストも実行
   */
  static async generateTestTickets(): Promise<Ticket[]> {
    // 現在時刻から明日の日付をJSTで計算
    const now = new Date();
    const today = toJSTDate(now);

    // 明日の日付を計算（JST基準）
    const tomorrowYear = today.getFullYear();
    const tomorrowMonth = today.getMonth() + 1; // createJSTDateTimeは1-12月
    const tomorrowDay = today.getDate() + 1;

    // 明日10:00 JSTでUTC時刻を作成
    const tomorrowSaleStart = createJSTDateTime(
      tomorrowYear,
      tomorrowMonth,
      tomorrowDay,
      10,
      0,
      0,
    );

    // 試合日は2週間後の同時刻
    const matchDate = createJSTDateTime(
      tomorrowYear,
      tomorrowMonth,
      tomorrowDay + 14,
      18,
      0,
      0,
    );

    // 基本的なテストチケット（実データに近い形式）
    const baseTicket = await Ticket.createNew({
      matchName: '[TEST] 川崎フロンターレ vs 浦和レッズ',
      matchDate,
      homeTeam: '川崎フロンターレ',
      awayTeam: '浦和レッズ',
      competition: 'J1リーグ',
      saleStartDate: tomorrowSaleStart,
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
      const rescheduledSaleStart = createJSTDateTime(
        tomorrowYear,
        tomorrowMonth,
        tomorrowDay,
        8, // 10:00 - 2時間 = 8:00 JST
        0,
        0,
      );

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
