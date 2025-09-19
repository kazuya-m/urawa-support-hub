import { Ticket } from '@/domain/entities/Ticket.ts';
import { ISiteScrapingService } from '../shared/interfaces/index.ts';
import { JLeagueRawTicketData } from '../jleague/types/JLeagueTypes.ts';
import { JLeagueDataParser } from '../jleague/parser/JLeagueDataParser.ts';
import { toJSTDate } from '@/shared/utils/datetime.ts';

/**
 * 本番環境E2Eテスト用スクレイピングサービス
 *
 * 実際のスクレイピング処理をシミュレートし、
 * 生データ → パース → エンティティ作成 → 保存 → 通知スケジューリング
 * の全フローをテストする
 */
export class TestJLeagueScrapingService implements ISiteScrapingService {
  readonly serviceName = 'J-League-Test';

  private readonly dataParser: JLeagueDataParser;

  constructor() {
    this.dataParser = new JLeagueDataParser();
  }

  /**
   * テストモードが有効かチェック
   */
  static isTestModeEnabled(): boolean {
    const value = Deno.env.get('ENABLE_TEST_SCRAPING');
    return value === 'true';
  }

  async collectTickets(): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    if (Deno.env.get('ENABLE_TEST_RESCHEDULE') === 'true') {
      // リスケジューリングテスト: 既存チケットと同じ試合で販売開始日のみ変更
      const rescheduledTicketData = this.generateRescheduledTicketRawData();
      const rescheduledTicket = await this.dataParser.parseToTicket(rescheduledTicketData);
      tickets.push(rescheduledTicket);
    } else {
      // 通常テスト: 新規チケット作成
      const newTicketData = this.generateNewTicketRawData();
      const newTicket = await this.dataParser.parseToTicket(newTicketData);
      tickets.push(newTicket);
    }

    return tickets;
  }

  /**
   * 新規チケット用の生データを生成
   * 明日10:00販売開始のテストチケット
   */
  private generateNewTicketRawData(): JLeagueRawTicketData {
    const now = new Date();
    const today = toJSTDate(now);

    // 明日の日付を計算（JST基準）
    const tomorrowYear = today.getFullYear();
    const tomorrowMonth = today.getMonth() + 1; // createJSTDateTimeは1-12月
    const tomorrowDay = today.getDate() + 1;

    // 試合日は2週間後
    const matchYear = tomorrowYear;
    const matchMonth = tomorrowMonth;
    const matchDay = tomorrowDay + 14;

    return {
      matchName: '[TEST] 川崎フロンターレ vs 浦和レッズ',
      matchDate: `${matchMonth}/${matchDay}`, // J-League形式: "3/15"
      venue: '等々力陸上競技場',
      ticketUrl: 'https://www.jleague-ticket.jp/test/perform/new/001',
      scrapedAt: new Date(),

      // 詳細ページ情報（シミュレート）
      enhancedMatchDateTime: `${matchYear}/${String(matchMonth).padStart(2, '0')}/${
        String(matchDay).padStart(2, '0')
      } 18:00`,
      competition: 'J1リーグ',
      saleDate: `${String(tomorrowMonth).padStart(2, '0')}/${
        String(tomorrowDay).padStart(2, '0')
      }(日)10:00〜${String(matchMonth).padStart(2, '0')}/${
        String(matchDay).padStart(2, '0')
      }(日)23:59`,
      ticketTypes: ['ビジター指定席大人', 'ビジター指定席小中'],
    };
  }

  /**
   * リスケジューリング用の生データを生成
   * 既存チケットと同じ試合だが、販売開始日が変更されたシナリオ
   */
  private generateRescheduledTicketRawData(): JLeagueRawTicketData {
    const now = new Date();
    const today = toJSTDate(now);

    // 明日の日付を計算（JST基準）
    const tomorrowYear = today.getFullYear();
    const tomorrowMonth = today.getMonth() + 1;
    const tomorrowDay = today.getDate() + 1;

    // 試合日は2週間後（新規チケットと同じ）
    const matchYear = tomorrowYear;
    const matchMonth = tomorrowMonth;
    const matchDay = tomorrowDay + 14;

    return {
      matchName: '[TEST] 川崎フロンターレ vs 浦和レッズ', // 新規チケットと同じ試合名
      matchDate: `${matchMonth}/${matchDay}`, // 新規チケットと同じ試合日
      venue: '等々力陸上競技場', // 新規チケットと同じ会場
      ticketUrl: 'https://www.jleague-ticket.jp/test/perform/new/001', // 同じURL
      scrapedAt: new Date(),

      // 詳細ページ情報（販売開始日が変更されたシナリオ）
      enhancedMatchDateTime: `${matchYear}/${String(matchMonth).padStart(2, '0')}/${
        String(matchDay).padStart(2, '0')
      } 18:00`,
      competition: 'J1リーグ',
      // 販売開始日を2時間早く変更（10:00 → 8:00）
      saleDate: `${String(tomorrowMonth).padStart(2, '0')}/${
        String(tomorrowDay).padStart(2, '0')
      }(日)08:00〜${String(matchMonth).padStart(2, '0')}/${
        String(matchDay).padStart(2, '0')
      }(日)23:59`,
      ticketTypes: ['ビジター指定席大人', 'ビジター指定席小中'],
    };
  }
}
