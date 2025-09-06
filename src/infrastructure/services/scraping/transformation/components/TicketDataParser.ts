import { TeamInfo } from '../../types/ValidationResult.ts';
import { parseSaleDate } from '@/domain/entities/SaleStatusUtils.ts';
import type { ScrapedTicketData } from '../../types/ScrapedTicketData.ts';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  skipReason?: string; // スキップ理由
  warnings: string[]; // 警告メッセージ
}

export interface ParsedDateInfo {
  matchDate: Date;
  saleStartDate?: Date;
  saleEndDate?: Date;
  saleStatus: 'before_sale' | 'on_sale' | 'ended';
}

export interface ParsedTicketData {
  matchName: string;
  matchDate: Date;
  saleStartDate: Date | null;
  homeTeam?: string;
  awayTeam?: string;
  venue?: string;
  ticketUrl?: string;
  ticketTypes: string[];
  parsedDates: ParsedDateInfo;
}

export class TicketDataParser {
  /**
   * エラー耐性のある統合パース・バリデーション処理
   * 必須フィールドなし: エラーログ + スキップ
   * saleStartDateなし: 警告ログ + 継続
   * その他オプショナル: ベストエフォート + 警告
   */
  static parseAndValidate(data: ScrapedTicketData): ParseResult<ParsedTicketData> {
    const warnings: string[] = [];

    // 【必須チェック】欠如時はスキップ
    if (!data.matchName?.trim()) {
      console.error(`[SKIP] Missing required field: matchName`, { data });
      return { success: false, skipReason: 'Missing matchName', warnings: [] };
    }

    if (!data.matchDate?.trim()) {
      console.error(`[SKIP] Missing required field: matchDate`, { data });
      return { success: false, skipReason: 'Missing matchDate', warnings: [] };
    }

    // 【基本フィールド処理】
    const matchName = data.matchName.trim();
    const matchDate = this.parseMatchDateSafely(data.matchDate, warnings);
    const teams = this.extractTeamsFromMatchName(matchName); // 既存メソッド

    // 【saleStartDate処理】通知に重要なフィールド
    let saleInfo: ParsedDateInfo;
    if (!data.saleDate?.trim()) {
      warnings.push(
        `[WARNING] Missing saleStartDate for ${matchName} - notifications may be affected`,
      );
      console.warn(`[WARNING] No sale date for ticket: ${matchName}`);
      saleInfo = {
        matchDate,
        saleStatus: 'before_sale' as const, // デフォルト状態
      };
    } else {
      try {
        const parsedSaleInfo = parseSaleDate(data.saleDate);
        // matchDateを設定
        saleInfo = {
          ...parsedSaleInfo,
          matchDate,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        warnings.push(`[WARNING] Failed to parse sale date: ${errorMessage}`);
        console.warn(`[WARNING] Sale date parse failed for ${matchName}:`, errorMessage);
        saleInfo = {
          matchDate,
          saleStatus: 'before_sale' as const,
        };
      }
    }

    // 【その他オプショナル】ベストエフォート
    const parsedData: ParsedTicketData = {
      matchName,
      matchDate,
      saleStartDate: saleInfo.saleStartDate || null,
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
      venue: this.normalizeVenueSafely(data.venue, warnings),
      ticketUrl: this.validateUrlSafely(data.ticketUrl, warnings),
      ticketTypes: data.ticketTypes || [],
      parsedDates: saleInfo,
    };

    return {
      success: true,
      data: parsedData,
      warnings,
    };
  }

  private static extractTeamsFromMatchName(matchName: string): TeamInfo {
    if (!matchName) return {};

    const normalized = matchName.trim();

    const vsPattern = /^(.+?)\s*(?:[vｖ][sｓ]|VS|vs)\s*(.+?)$/i;
    const vsMatch = normalized.match(vsPattern);
    if (vsMatch) {
      return {
        homeTeam: vsMatch[1].trim(),
        awayTeam: vsMatch[2].trim(),
      };
    }

    const taiPattern = /^(.+?)\s*対\s*(.+?)$/;
    const taiMatch = normalized.match(taiPattern);
    if (taiMatch) {
      return {
        homeTeam: taiMatch[1].trim(),
        awayTeam: taiMatch[2].trim(),
      };
    }

    const dashPattern = /^(.+?)\s*[-−]\s*(.+?)$/;
    const dashMatch = normalized.match(dashPattern);
    if (dashMatch) {
      return {
        homeTeam: dashMatch[1].trim(),
        awayTeam: dashMatch[2].trim(),
      };
    }

    const crossPattern = /^(.+?)\s*[×x]\s*(.+?)$/i;
    const crossMatch = normalized.match(crossPattern);
    if (crossMatch) {
      return {
        homeTeam: crossMatch[1].trim(),
        awayTeam: crossMatch[2].trim(),
      };
    }

    return {};
  }

  private static parseMatchDateSafely(dateStr: string, warnings: string[]): Date {
    try {
      // 既存のparseDatesロジックを流用
      const currentYear = new Date().getFullYear();
      const [month, day] = dateStr.split('/').map((num) => parseInt(num));
      if (isNaN(month) || isNaN(day)) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      const matchDate = new Date(currentYear, month - 1, day);
      if (isNaN(matchDate.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
      return matchDate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`[WARNING] Invalid match date format: ${dateStr}, using current date`);
      console.warn(`[WARNING] Match date parse failed: ${errorMessage}`);
      return new Date();
    }
  }

  private static normalizeVenueSafely(
    venue: string | undefined,
    warnings: string[],
  ): string | undefined {
    if (!venue?.trim()) {
      warnings.push('[INFO] Venue not provided');
      return undefined;
    }
    return venue.trim();
  }

  private static validateUrlSafely(
    url: string | undefined,
    warnings: string[],
  ): string | undefined {
    if (!url?.trim()) {
      warnings.push('[INFO] Ticket URL not provided');
      return undefined;
    }

    try {
      new URL(url);
      return url.trim();
    } catch {
      warnings.push(`[WARNING] Invalid ticket URL format: ${url}`);
      console.warn(`[WARNING] Invalid URL: ${url}`);
      return url.trim(); // 無効でも保存（手動確認可能）
    }
  }
}
