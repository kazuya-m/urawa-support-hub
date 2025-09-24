import { IPage } from '@/infrastructure/clients/interfaces/IPlaywrightClient.ts';
import {
  HIROSHIMA_SCRAPING_CONFIG,
  HiroshimaSchedulePageConfig,
} from '@/infrastructure/services/scraping/sources/official/hiroshima/HiroshimaConfig.ts';
import { HiroshimaRawTicketData } from '../types/HiroshimaTypes.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import type { ElementHandle } from 'playwright';

/**
 * サンフレッチェ広島公式サイトからのデータ抽出クラス
 * 浦和レッズ戦のみを抽出（すべてアウェイチケット確定）
 */
export class HiroshimaDataExtractor {
  private warnings: string[] = [];

  constructor(
    private readonly config: HiroshimaSchedulePageConfig,
    private readonly urawaKeywords: string[],
  ) {}

  async extractTickets(page: IPage): Promise<HiroshimaRawTicketData[]> {
    const tickets: HiroshimaRawTicketData[] = [];

    try {
      // テーブル行を取得
      const rowElements = await this.getTableRows(page);

      if (rowElements.length === 0) {
        this.addWarning('No ticket rows found');
        return tickets;
      }

      CloudLogger.info('Hiroshima ticket rows found', {
        category: LogCategory.TICKET_COLLECTION,
        context: {
          stage: 'data_extraction',
        },
        metadata: {
          source: 'hiroshima',
          rowCount: rowElements.length,
        },
      });

      // 各行からチケット情報を抽出（浦和レッズ戦のみ）
      for (const rowElement of rowElements) {
        try {
          const rowData = await this.extractRowData(rowElement);
          if (rowData && this.isUrawaMatch(rowData.opponent)) {
            tickets.push(rowData);
            CloudLogger.info('Urawa match found in Hiroshima schedule', {
              category: LogCategory.TICKET_COLLECTION,
              context: {
                stage: 'data_extraction',
              },
              metadata: {
                source: 'hiroshima',
                opponent: rowData.opponent,
                date: rowData.matchDate,
                status: rowData.saleStatus,
              },
            });
          }
        } catch (error) {
          this.addWarning(`Failed to extract data from row: ${error}`);
        }
      }

      return tickets;
    } catch (error) {
      CloudLogger.error('Failed to extract Hiroshima tickets', {
        category: LogCategory.TICKET_COLLECTION,
        context: {
          stage: 'data_extraction',
        },
        metadata: {
          source: 'hiroshima',
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  private async getTableRows(page: IPage): Promise<ElementHandle[]> {
    for (const selector of this.config.selectors.ticketContainer) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          return elements;
        }
      } catch {
        continue;
      }
    }
    return [];
  }

  private async extractRowData(rowElement: ElementHandle): Promise<HiroshimaRawTicketData | null> {
    try {
      // 1番目のtdから試合情報を取得
      const matchInfo = await this.extractMatchInfo(rowElement);
      if (!matchInfo.date) {
        return null;
      }

      // 会場情報が取得できない場合は警告
      if (!matchInfo.venue) {
        this.addWarning('Venue information not found');
      }

      // 対戦相手を取得（img要素のalt属性から）
      const opponent = await this.extractOpponent(rowElement);
      if (!opponent) {
        return null;
      }

      // 販売状況を取得
      const saleStatus = await this.extractText(rowElement, this.config.selectors.ticketStatus);
      if (!saleStatus) {
        this.addWarning('Sale status not found');
        return null;
      }

      // 一般販売日を取得（6番目のtd）
      const saleDate = await this.extractSaleDate(rowElement);

      return {
        matchDate: matchInfo.date!, // 既に null チェック済み
        matchTime: matchInfo.time || undefined,
        opponent,
        venue: matchInfo.venue,
        saleStatus,
        ticketUrl: HIROSHIMA_SCRAPING_CONFIG.ticketPurchaseUrl, // 固定のチケット購入URL
        saleDate,
        ticketTypes: ['ビジター席'], // サンフレッチェ広島公式サイトなので確定でビジター席
      };
    } catch (error) {
      this.addWarning(`Row data extraction failed: ${error}`);
      return null;
    }
  }

  /**
   * 1番目のtdから日付、時間、会場を抽出
   * HTML例: "第36節<br>11.9 [日]<br>13:00K.O.<br>エディオンピースウイング広島"
   */
  private async extractMatchInfo(rowElement: ElementHandle): Promise<{
    date: string | null;
    time: string | null;
    venue: string | null;
  }> {
    try {
      const firstTd = await rowElement.$('td:first-child p');
      if (!firstTd) {
        return { date: null, time: null, venue: null };
      }

      const fullText = await firstTd.textContent();
      if (!fullText) {
        return { date: null, time: null, venue: null };
      }

      // テキストを行で分割
      const lines = fullText.split('\n').map((line) => line.trim()).filter((line) => line);

      let date = null;
      let time = null;
      let venue = null;

      for (const line of lines) {
        // 日付を抽出（例: "11.9 [日]"）
        const dateMatch = line.match(/(\d{1,2}\.\d{1,2})\s*\[[^\]]+\]/);
        if (dateMatch) {
          date = dateMatch[1];
          continue;
        }

        // 時間を抽出（例: "13:00K.O."）
        const timeMatch = line.match(/(\d{1,2}:\d{2})K\.O\./);
        if (timeMatch) {
          time = timeMatch[1];
          continue;
        }

        // 会場を抽出（エディオンピースウイング広島など）
        if (
          line.includes('エディオン') || line.includes('広島') ||
          (!line.includes('節') && !line.includes('K.O.'))
        ) {
          venue = line;
        }
      }

      return { date, time, venue };
    } catch {
      return { date: null, time: null, venue: null };
    }
  }

  private async extractText(
    rowElement: ElementHandle,
    selectors: string[],
  ): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const element = await rowElement.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text?.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  private async extractOpponent(rowElement: ElementHandle): Promise<string | null> {
    for (const selector of this.config.selectors.opponent) {
      try {
        const imgElement = await rowElement.$(selector);
        if (imgElement) {
          const alt = await imgElement.getAttribute('alt');
          if (alt?.trim()) {
            return alt.trim();
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * 6番目のtdから一般販売日を取得
   * HTML例: "10/10(金)<br>12:00～"
   */
  private async extractSaleDate(rowElement: ElementHandle): Promise<string | undefined> {
    try {
      const saleTd = await rowElement.$('td:nth-child(6)');
      if (!saleTd) {
        return undefined;
      }

      const saleText = await saleTd.textContent();
      if (!saleText?.trim()) {
        return undefined;
      }

      return saleText.trim();
    } catch {
      return undefined;
    }
  }

  private isUrawaMatch(opponent: string): boolean {
    const lowerOpponent = opponent.toLowerCase();
    return this.urawaKeywords.some((keyword) => lowerOpponent.includes(keyword.toLowerCase()));
  }

  private addWarning(message: string): void {
    this.warnings.push(message);
    CloudLogger.warn('Hiroshima data extraction warning', {
      category: LogCategory.TICKET_COLLECTION,
      context: {
        stage: 'data_extraction',
      },
      metadata: {
        source: 'hiroshima',
        warning: message,
      },
    });
  }

  getAndClearWarnings(): string[] {
    const currentWarnings = [...this.warnings];
    this.warnings = [];
    return currentWarnings;
  }
}
