import { Ticket } from '@/domain/entities/Ticket.ts';
import { parseMatchDate, parseSaleDate } from '@/domain/entities/SaleStatusUtils.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';
import { IDataParser } from '../../shared/interfaces/index.ts';
import { JLeagueRawTicketData } from '../types/JLeagueTypes.ts';

/**
 * J-League固有のデータパーサー
 * J-League特有の形式を統一されたTicketに変換
 */
export class JLeagueDataParser implements IDataParser<JLeagueRawTicketData> {
  async parseToTicket(
    rawData: JLeagueRawTicketData,
    referenceDate: Date = new Date(),
  ): Promise<Ticket> {
    // 1. 日時処理 - 詳細ページ情報を優先
    const matchDate = this.parseMatchDateTime(rawData, referenceDate);

    // 2. チーム情報抽出
    const teams = this.extractTeams(rawData.matchName);

    // 3. 販売日時処理
    const saleInfo = this.parseSaleInfo(rawData.saleDate || null, referenceDate);

    // 4. 大会名正規化
    const competition = this.normalizeCompetition(rawData.competition);

    return await Ticket.createNew({
      matchName: rawData.matchName,
      matchDate,
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
      competition,
      saleStartDate: saleInfo?.saleStartDate || null,
      saleEndDate: saleInfo?.saleEndDate,
      venue: this.normalizeVenue(rawData.venue),
      ticketTypes: rawData.ticketTypes,
      ticketUrl: rawData.ticketUrl,
      scrapedAt: rawData.scrapedAt,
      saleStatus: saleInfo?.saleStatus,
      notificationScheduled: false,
    });
  }

  async parseMultipleToTickets(
    rawData: JLeagueRawTicketData[],
    referenceDate: Date = new Date(),
  ): Promise<Ticket[]> {
    return await Promise.all(rawData.map((data) => this.parseToTicket(data, referenceDate)));
  }

  /**
   * J-League特有の日時解析
   * 詳細ページの情報を優先し、フォールバックも処理
   */
  private parseMatchDateTime(rawData: JLeagueRawTicketData, referenceDate: Date): Date {
    // 詳細ページの統合日時情報を優先
    if (rawData.enhancedMatchDateTime) {
      return this.parseEnhancedDateTime(rawData.enhancedMatchDateTime, referenceDate);
    }

    // フォールバック: 一覧ページの日付のみ
    if (rawData.matchDate) {
      return this.parseBasicDate(rawData.matchDate, referenceDate);
    }

    // 最終フォールバック
    return referenceDate;
  }

  /**
   * 詳細ページの統合日時形式を解析
   * "2025/03/15 14:00" 形式
   */
  private parseEnhancedDateTime(dateTimeStr: string, referenceDate: Date): Date {
    try {
      const parts = dateTimeStr.trim().split(' ');
      if (parts.length !== 2) {
        throw new Error(`Invalid datetime format: ${dateTimeStr}`);
      }

      const [dateStr, timeStr] = parts;
      const dateParts = dateStr.split('/');
      const timeParts = timeStr.split(':');

      if (dateParts.length !== 3 || timeParts.length !== 2) {
        throw new Error(`Invalid datetime components: ${dateTimeStr}`);
      }

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const day = parseInt(dateParts[2]);
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);

      // 4桁年が明示されている場合はそのまま使用
      if (year >= 1000) {
        const matchDate = new Date(year, month - 1, day, hour, minute);
        if (isNaN(matchDate.getTime())) {
          throw new Error(`Invalid date values: ${dateTimeStr}`);
        }
        return matchDate;
      }

      // 2桁年の場合は年跨ぎロジックを適用
      return parseMatchDate(month, day, hour, minute, referenceDate);
    } catch (_error) {
      // エラー時は基準日時を返す
      return referenceDate;
    }
  }

  /**
   * 基本的な日付形式を解析
   * "3/15" 形式（年跨ぎ対応）
   */
  private parseBasicDate(dateStr: string, referenceDate: Date): Date {
    try {
      const [month, day] = dateStr.split('/').map((num) => parseInt(num));
      if (isNaN(month) || isNaN(day)) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }

      // 年跨ぎロジックを適用
      return parseMatchDate(month, day, 0, 0, referenceDate);
    } catch (_error) {
      return referenceDate;
    }
  }

  /**
   * チーム情報の抽出
   */
  private extractTeams(matchName: string): { homeTeam?: string; awayTeam?: string } {
    if (!matchName) return {};

    const normalized = matchName.trim();

    // vs パターン
    const vsPattern = /^(.+?)\s*(?:[vｖ][sｓ]|VS|vs)\s*(.+?)$/i;
    const vsMatch = normalized.match(vsPattern);
    if (vsMatch) {
      return {
        homeTeam: vsMatch[1].trim(),
        awayTeam: vsMatch[2].trim(),
      };
    }

    // 対 パターン
    const taiPattern = /^(.+?)\s*対\s*(.+?)$/;
    const taiMatch = normalized.match(taiPattern);
    if (taiMatch) {
      return {
        homeTeam: taiMatch[1].trim(),
        awayTeam: taiMatch[2].trim(),
      };
    }

    // その他のパターン
    const patterns = [
      /^(.+?)\s*[-−]\s*(.+?)$/,
      /^(.+?)\s*[×x]\s*(.+?)$/i,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          homeTeam: match[1].trim(),
          awayTeam: match[2].trim(),
        };
      }
    }

    // 浦和が含まれていない場合の推定
    const urawaIncluded = J_LEAGUE_SCRAPING_CONFIG.urawaTeamNames.alternatives.some((
      name: string,
    ) => normalized.includes(name));
    if (normalized && !urawaIncluded) {
      return {
        homeTeam: normalized,
        awayTeam: J_LEAGUE_SCRAPING_CONFIG.urawaTeamNames.primary,
      };
    }

    return {};
  }

  /**
   * 販売情報の解析
   */
  private parseSaleInfo(saleDate: string | null, referenceDate: Date) {
    if (!saleDate?.trim()) {
      return null;
    }

    try {
      return parseSaleDate(saleDate, referenceDate);
    } catch (_error) {
      return null;
    }
  }

  /**
   * 会場名の正規化
   */
  private normalizeVenue(venue: string): string {
    if (!venue?.trim()) {
      return venue;
    }

    // 連続する空白文字を単一のスペースに置換
    return venue.trim().replace(/\s+/g, ' ');
  }

  /**
   * 大会名の正規化
   */
  private normalizeCompetition(competition: string | null | undefined): string | undefined {
    if (!competition?.trim()) {
      return undefined;
    }

    const normalized = competition.trim();
    return J_LEAGUE_SCRAPING_CONFIG.competitionNormalization[
      normalized as keyof typeof J_LEAGUE_SCRAPING_CONFIG.competitionNormalization
    ] || normalized;
  }
}
