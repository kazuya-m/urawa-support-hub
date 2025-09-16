import { Ticket } from '@/domain/entities/Ticket.ts';
import { parseMatchDate, parseSaleDate } from '@/domain/entities/SaleStatusUtils.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';
import { IDataParser } from '../../shared/interfaces/index.ts';
import { JLeagueRawTicketData } from '../types/JLeagueTypes.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';
import { LogCategory } from '@/shared/logging/types.ts';

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

    // 4. 販売データ整合性検証とログ出力
    this.validateSaleDataIntegrity(rawData, saleInfo, referenceDate);

    // 5. 補完情報の検証とWARNINGログ
    this.validateOptionalFields(rawData);

    // 6. 大会名正規化
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
    const context = {
      matchName: rawData.matchName,
      ticketUrl: rawData.ticketUrl,
    };

    // 詳細ページの統合日時情報を優先
    if (rawData.enhancedMatchDateTime) {
      return this.parseEnhancedDateTime(rawData.enhancedMatchDateTime, referenceDate, context);
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
  private parseEnhancedDateTime(
    dateTimeStr: string,
    referenceDate: Date,
    context?: { matchName?: string; ticketUrl?: string },
  ): Date {
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

      // 4桁年が明示されている場合もJST→UTC変換を適用
      if (year >= 1000) {
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
          throw new Error(`Invalid date values: ${dateTimeStr}`);
        }
        // parseMatchDate関数を使用してJST→UTC変換を実行
        return parseMatchDate(month, day, hour, minute, new Date(year, 0, 1));
      }

      // 2桁年の場合は年跨ぎロジックを適用
      return parseMatchDate(month, day, hour, minute, referenceDate);
    } catch (_error) {
      // 未知のパターン検出（ERROR） - データ品質監視
      CloudLogger.error('Unknown date pattern detected', {
        category: LogCategory.PARSING,
        dataQuality: {
          issueType: 'UNKNOWN_PATTERN',
          field: 'matchDateTime',
          rawValue: dateTimeStr,
          expectedPattern: 'YYYY/MM/DD HH:MM',
        },
        context: {
          matchName: context?.matchName,
          ticketUrl: context?.ticketUrl,
        },
        error: {
          code: ErrorCodes.PARSE_MATCH_DATE_UNKNOWN_FORMAT,
          details: `Unexpected date format: ${dateTimeStr}`,
          recoverable: true,
        },
      });

      // フォールバック処理継続
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
   * 販売データ整合性検証
   * 通知機能に影響する重要な問題をERRORレベルでログ出力
   */
  private validateSaleDataIntegrity(
    rawData: JLeagueRawTicketData,
    saleInfo: {
      saleStartDate?: Date;
      saleEndDate?: Date;
      saleStatus: 'before_sale' | 'on_sale' | 'ended';
    } | null,
    _referenceDate: Date,
  ): void {
    const context = {
      matchName: rawData.matchName,
      ticketUrl: rawData.ticketUrl,
      saleStatus: saleInfo?.saleStatus,
    };

    // 販売前なのに販売開始日が取得できない場合（通知機能阻害）
    if (saleInfo?.saleStatus === 'before_sale' && !saleInfo?.saleStartDate) {
      CloudLogger.error('Sale start date missing for pre-sale ticket', {
        category: LogCategory.VALIDATION,
        dataQuality: {
          issueType: 'MISSING_FIELD',
          field: 'saleStartDate',
        },
        context,
        error: {
          code: ErrorCodes.PARSE_SALE_START_DATE_MISSING_BEFORE_SALE,
          details: 'Sale start date is required for pre-sale tickets to enable notifications',
          recoverable: false,
        },
      });
    }
  }

  /**
   * 補完情報の検証
   * 処理は継続可能だが情報が不完全な場合にWARNINGレベルでログ出力
   */
  private validateOptionalFields(rawData: JLeagueRawTicketData): void {
    const context = {
      matchName: rawData.matchName,
      ticketUrl: rawData.ticketUrl,
    };

    // 会場情報が取得できない
    if (!rawData.venue?.trim()) {
      CloudLogger.warning('Venue information is missing', {
        category: LogCategory.PARSING,
        dataQuality: {
          issueType: 'MISSING_FIELD',
          field: 'venue',
        },
        context,
        error: {
          code: ErrorCodes.PARSE_VENUE_INFO_MISSING,
          details: 'Venue information could not be extracted',
          recoverable: true,
        },
      });
    }

    // 大会名が取得できない
    if (!rawData.competition?.trim()) {
      CloudLogger.warning('Competition name is missing', {
        category: LogCategory.PARSING,
        dataQuality: {
          issueType: 'MISSING_FIELD',
          field: 'competition',
        },
        context,
        error: {
          code: ErrorCodes.PARSE_COMPETITION_MISSING,
          details: 'Competition name could not be extracted',
          recoverable: true,
        },
      });
    }
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
