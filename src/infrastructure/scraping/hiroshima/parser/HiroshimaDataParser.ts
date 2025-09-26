import { Ticket } from '@/domain/entities/Ticket.ts';
import { HiroshimaRawTicketData } from '../types/HiroshimaTypes.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';
import { createMatchDateFromJST } from '@/domain/entities/SaleStatusUtils.ts';

/**
 * サンフレッチェ広島のデータを共通のTicket形式に変換
 * サンフレッチェ広島サイト固有のフォーマットに対応
 */
export class HiroshimaDataParser {
  async parseMultipleToTickets(rawTickets: HiroshimaRawTicketData[]): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    for (const rawTicket of rawTickets) {
      try {
        const ticket = await this.parseToTicket(rawTicket);
        if (ticket) {
          tickets.push(ticket);
        }
      } catch (error) {
        CloudLogger.error('Failed to parse Hiroshima ticket', {
          category: LogCategory.TICKET_COLLECTION,
          context: {
            stage: 'data_parsing',
          },
          metadata: {
            source: 'hiroshima',
            rawTicket,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return tickets;
  }

  private async parseToTicket(rawTicket: HiroshimaRawTicketData): Promise<Ticket | null> {
    try {
      // 試合日時をパース（サンフレッチェ広島サイト固有のフォーマット）
      const matchDate = this.parseMatchDate(rawTicket.matchDate, rawTicket.matchTime);
      if (!matchDate) {
        CloudLogger.warn('Failed to parse match date', {
          category: LogCategory.TICKET_COLLECTION,
          context: {
            stage: 'data_parsing',
          },
          metadata: {
            source: 'hiroshima',
            date: rawTicket.matchDate,
            time: rawTicket.matchTime,
          },
        });
        return null;
      }

      // 販売開始日をパース（もしあれば）
      const saleStartDate = this.parseSaleDate(rawTicket.saleDate);

      // 販売状況を判定
      const saleStatus = this.determineSaleStatus(rawTicket.saleStatus);

      // チケットタイトルを生成（アウェイ戦なので「サンフレッチェ広島 vs 浦和レッズ」）
      const ticketTitle = `サンフレッチェ広島 vs 浦和レッズ`;

      // 大会名を判定（デフォルトはJ1リーグ）
      const competition = this.normalizeCompetition(rawTicket.competition);

      const ticket = await Ticket.createNew({
        matchName: ticketTitle,
        competition: competition,
        matchDate: matchDate,
        venue: rawTicket.venue || undefined,
        saleStartDate: saleStartDate,
        saleStatus: saleStatus,
        ticketUrl: rawTicket.ticketUrl || '',
        ticketTypes: rawTicket.ticketTypes,
        homeTeam: 'サンフレッチェ広島', // ホームチーム
        awayTeam: '浦和レッズ', // アウェイチーム
        scrapedAt: new Date(),
      });

      return ticket;
    } catch (error) {
      CloudLogger.error('Error parsing Hiroshima ticket', {
        category: LogCategory.TICKET_COLLECTION,
        context: {
          stage: 'data_parsing',
        },
        metadata: {
          source: 'hiroshima',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return null;
    }
  }

  /**
   * サンフレッチェ広島サイト固有の日付フォーマットをパース
   * 例: "2.23 [日・祝]", "10.26 [土]"
   */
  private parseMatchDate(dateStr: string, timeStr?: string): Date | null {
    try {
      // 日付から月日を抽出（例: "2.23 [日・祝]" -> "2.23"）
      const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})/);
      if (!dateMatch) {
        return null;
      }

      const month = parseInt(dateMatch[1], 10);
      const day = parseInt(dateMatch[2], 10);

      // 時間をパース（例: "14:00 K.O." -> "14:00"）
      // 時間が取得できない場合は不正確なデフォルト値は使用しない
      if (!timeStr) {
        return null;
      }

      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) {
        return null;
      }

      const hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);

      // ドメイン層のロジックを使用（年跨ぎ + JST→UTC変換）
      return createMatchDateFromJST(month, day, hour, minute);
    } catch {
      return null;
    }
  }

  /**
   * 販売開始日をパース（サンフレッチェ広島サイト固有）
   * 例: "10/10(金)<br>12:00～" または "10/10(金) 12:00～"
   */
  private parseSaleDate(saleDateStr?: string): Date | null {
    if (!saleDateStr) {
      return null;
    }

    try {
      // 日付を抽出（例: "10/10"）
      const dateMatch = saleDateStr.match(/(\d{1,2})\/(\d{1,2})/);
      if (!dateMatch) {
        return null;
      }

      const month = parseInt(dateMatch[1], 10);
      const day = parseInt(dateMatch[2], 10);

      // 時間を抽出（例: "12:00"）
      const timeMatch = saleDateStr.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) {
        // 時間が取得できない場合はnullを返す（デフォルト値は使わない）
        return null;
      }

      const hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);

      // ドメイン層のロジックを使用（年判定 + JST→UTC変換）
      return createMatchDateFromJST(month, day, hour, minute);
    } catch {
      return null;
    }
  }

  /**
   * 販売状況を判定（サンフレッチェ広島サイト固有）
   */
  private determineSaleStatus(statusStr: string): SaleStatus | undefined {
    const lowerStatus = statusStr.toLowerCase();

    // キーワードによる判定
    const soldOutKeywords = ['完売', '売り切れ', '全席種完売'];
    const endedKeywords = ['販売終了', '発売終了', '終了'];
    const onSaleKeywords = ['販売中', '発売中', 'WEBで購入', '購入可能'];
    const beforeSaleKeywords = ['販売開始前', '発売前', '販売予定'];

    switch (true) {
      case soldOutKeywords.some((keyword) => lowerStatus.includes(keyword)):
        return 'sold_out';

      case endedKeywords.some((keyword) => lowerStatus.includes(keyword)):
        return 'ended';

      case onSaleKeywords.some((keyword) => lowerStatus.includes(keyword)):
        return 'on_sale';

      case beforeSaleKeywords.some((keyword) => lowerStatus.includes(keyword)):
        return 'before_sale';

      default:
        return undefined;
    }
  }

  /**
   * 大会名を正規化
   */
  private normalizeCompetition(competition?: string): string {
    if (!competition) {
      return 'J1リーグ';
    }

    // サンフレッチェ広島サイトの表記を統一
    const competitionMap: Record<string, string> = {
      'J1': 'J1リーグ',
      'J1リーグ': 'J1リーグ',
      '明治安田J1': 'J1リーグ',
      'ルヴァン': 'ルヴァンカップ',
      'ルヴァンカップ': 'ルヴァンカップ',
      '天皇杯': '天皇杯',
      'ACL': 'ACLE',
      'ACLE': 'ACLE',
    };

    for (const [key, value] of Object.entries(competitionMap)) {
      if (competition.includes(key)) {
        return value;
      }
    }

    return competition;
  }
}
