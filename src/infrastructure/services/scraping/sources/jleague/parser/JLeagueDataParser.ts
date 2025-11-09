import { Ticket } from '@/domain/entities/Ticket.ts';
import { SaleStatusService } from '@/domain/services/SaleStatusService.ts';
import { DateCalculationService } from '@/domain/services/DateCalculationService.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';
import { IDataParser } from '@/infrastructure/services/scraping/shared/interfaces/index.ts';
import { JLeagueRawTicketData } from '../types/JLeagueTypes.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';
import { createJSTDateTime } from '@/shared/utils/datetime.ts';

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

    // 3. 販売日時処理（試合日を基準に年を決定）
    const saleInfo = this.parseSaleInfo(
      rawData.saleDate || null,
      rawData.saleStatusText,
      matchDate,
      referenceDate,
    );

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
      saleEndDate: saleInfo?.saleEndDate || null,
      venue: this.normalizeVenue(rawData.venue),
      ticketTypes: rawData.ticketTypes || null,
      ticketUrl: rawData.ticketUrl || null,
      scrapedAt: rawData.scrapedAt,
      saleStatus: saleInfo?.saleStatus ?? null,
      notificationScheduled: false,
    });
  }

  async parseMultipleToTickets(
    rawData: JLeagueRawTicketData[],
    referenceDate: Date = new Date(),
  ): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    for (const data of rawData) {
      try {
        const ticket = await this.parseToTicket(data, referenceDate);
        tickets.push(ticket);
      } catch (error) {
        CloudLogger.error('Failed to parse ticket', {
          category: LogCategory.PARSING,
          context: {
            stage: 'data_parsing',
          },
          metadata: {
            source: 'jleague',
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return tickets;
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

      // 4桁年が明示されている場合は年が確定しているため、直接createJSTDateTimeを使用
      if (year >= 1000) {
        if (
          isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) ||
          month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 ||
          minute < 0 || minute > 59
        ) {
          throw new Error(`Invalid date values: ${dateTimeStr}`);
        }
        // 年が明示されている場合は年跨ぎロジック不要
        return createJSTDateTime(year, month, day, hour, minute);
      }

      // 2桁年の場合は年跨ぎロジックを適用
      return DateCalculationService.createMatchDateFromJST(month, day, hour, minute, referenceDate);
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
          stage: 'parsing',
        },
        data: {
          payload: {
            matchName: context?.matchName,
            ticketUrl: context?.ticketUrl,
          },
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
      return DateCalculationService.createMatchDateFromJST(month, day, 0, 0, referenceDate);
    } catch (_error) {
      return referenceDate;
    }
  }

  /**
   * チーム情報の抽出
   */
  private extractTeams(matchName: string): { homeTeam: string | null; awayTeam: string | null } {
    if (!matchName) return { homeTeam: null, awayTeam: null };

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

    return { homeTeam: null, awayTeam: null };
  }

  /**
   * Jリーグサイト固有の販売情報解析
   * Jリーグ固有のフォーマット（曜日付き）をパース
   */
  private parseSaleInfo(
    saleDate: string | null,
    saleStatusText: string | undefined,
    matchDate: Date,
    referenceDate: Date,
  ) {
    // 完売表示がある場合は最優先で判定
    if (saleStatusText?.trim()) {
      const soldOutStatus = this.checkSoldOutStatus(saleStatusText);
      if (soldOutStatus) {
        return { saleStatus: soldOutStatus };
      }
    }

    // 販売日時情報がない場合
    if (!saleDate?.trim()) {
      return null;
    }

    try {
      return this.parseJLeagueSaleDate(saleDate, matchDate, referenceDate);
    } catch (_error) {
      return null;
    }
  }

  /**
   * 完売ステータス判定
   * 一覧ページの販売状況表示から完売・販売終了を判定
   */
  private checkSoldOutStatus(statusText: string): SaleStatus | null {
    const cleanedStatus = statusText.trim().replace(/\s+/g, ' ');

    // 完売キーワード
    const soldOutKeywords = ['完売', '売り切れ', '空席なし', '全席種完売'];
    if (soldOutKeywords.some((keyword) => cleanedStatus.includes(keyword))) {
      return 'sold_out';
    }

    // 販売終了キーワード
    const endedKeywords = ['販売終了', '発売終了', '終了'];
    if (endedKeywords.some((keyword) => cleanedStatus.includes(keyword))) {
      return 'ended';
    }

    return null;
  }

  /**
   * Jリーグサイト固有の販売日時フォーマット解析
   *
   * @param saleText - 販売日時テキスト（例: "11/06(水)10:00〜"）
   * @param matchDate - 試合日（販売日の年を決定するために使用）
   * @param referenceDate - 現在日時
   */
  private parseJLeagueSaleDate(
    saleText: string,
    matchDate: Date,
    referenceDate: Date,
  ): {
    saleStartDate?: Date;
    saleEndDate?: Date;
    saleStatus: SaleStatus;
  } {
    // Jリーグサイト固有のフォーマット（曜日の括弧付き）
    const beforeSalePattern = /^(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})〜$/;
    const onSalePattern = /^〜(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})$/;
    const fullRangePattern =
      /(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})〜(\d{2})\/(\d{2})\([月火水木金土日]\)(\d{2}):(\d{2})/;

    const beforeSaleMatch = saleText.match(beforeSalePattern);
    if (beforeSaleMatch) {
      const [, month, day, hour, minute] = beforeSaleMatch;
      const saleStartDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
      );
      return { saleStartDate, saleStatus: 'before_sale' };
    }

    const onSaleMatch = saleText.match(onSalePattern);
    if (onSaleMatch) {
      const [, month, day, hour, minute] = onSaleMatch;
      const saleEndDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
      );
      return { saleEndDate, saleStatus: 'on_sale' };
    }

    const fullRangeMatch = saleText.match(fullRangePattern);
    if (fullRangeMatch) {
      const [, startMonth, startDay, startHour, startMinute, endMonth, endDay, endHour, endMinute] =
        fullRangeMatch;
      const saleStartDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(startMonth),
        parseInt(startDay),
        parseInt(startHour),
        parseInt(startMinute),
      );
      const saleEndDate = this.createSaleDateFromMatchDate(
        matchDate,
        parseInt(endMonth),
        parseInt(endDay),
        parseInt(endHour),
        parseInt(endMinute),
      );
      const saleStatus = SaleStatusService.determineSaleStatus(
        saleStartDate,
        saleEndDate,
        referenceDate,
      );
      return { saleStartDate, saleEndDate, saleStatus };
    }

    throw new Error(`Unknown sale date format: ${saleText}`);
  }

  /**
   * 試合日を基準に販売日を作成
   * 販売日の年は試合日との比較により決定（販売日は試合日より前である必要がある）
   */
  private createSaleDateFromMatchDate(
    matchDate: Date,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): Date {
    const year = DateCalculationService.determineSaleYear(matchDate, month, day);
    return createJSTDateTime(year, month, day, hour, minute);
  }

  /**
   * 会場名の正規化
   */
  private normalizeVenue(venue: string | null | undefined): string | null {
    if (!venue?.trim()) {
      return null;
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
      saleStatus: SaleStatus;
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
        context: {
          stage: 'parsing',
        },
        data: {
          payload: {
            matchName: context.matchName,
            ticketUrl: context.ticketUrl,
            saleStatus: context.saleStatus,
          },
        },
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
        context: {
          stage: 'parsing',
        },
        data: {
          payload: {
            matchName: context.matchName,
            ticketUrl: context.ticketUrl,
          },
        },
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
        context: {
          stage: 'parsing',
        },
        data: {
          payload: {
            matchName: context.matchName,
            ticketUrl: context.ticketUrl,
          },
        },
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
  private normalizeCompetition(competition: string | null | undefined): string | null {
    if (!competition?.trim()) {
      return null;
    }

    const normalized = competition.trim();
    return J_LEAGUE_SCRAPING_CONFIG.competitionNormalization[
      normalized as keyof typeof J_LEAGUE_SCRAPING_CONFIG.competitionNormalization
    ] || normalized;
  }
}
