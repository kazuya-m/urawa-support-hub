import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';
import {
  HIROSHIMA_SCRAPING_CONFIG,
  HiroshimaSchedulePageConfig,
} from '@/infrastructure/services/scraping/sources/hiroshima/HiroshimaConfig.ts';
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

      // 販売日の列（4〜7 列目）は、グループの先頭行から後続行へ rowspan で共有される
      let sharedSaleDate: { value: string | undefined; remainingRows: number } = {
        value: undefined,
        remainingRows: 0,
      };

      // 各行からチケット情報を抽出（浦和レッズ戦のみ）
      for (const rowElement of rowElements) {
        try {
          // 販売日は rowspan を追跡するため、浦和戦以外の行でも読む
          const ownSaleDate = await this.extractSaleDate(rowElement);
          let saleDate: string | undefined;
          if (ownSaleDate) {
            saleDate = ownSaleDate.value;
            sharedSaleDate = { value: ownSaleDate.value, remainingRows: ownSaleDate.rowspan - 1 };
          } else if (sharedSaleDate.remainingRows > 0) {
            saleDate = sharedSaleDate.value;
            sharedSaleDate = { ...sharedSaleDate, remainingRows: sharedSaleDate.remainingRows - 1 };
          } else {
            saleDate = undefined;
          }

          // まず対戦相手だけを確認
          const opponent = await this.extractOpponent(rowElement);
          if (!opponent || !this.isUrawaMatch(opponent)) {
            // 浦和戦でなければスキップ
            continue;
          }

          // 浦和戦の場合のみ詳細データを抽出
          const rowData = await this.extractRowData(rowElement, saleDate);
          if (rowData) {
            tickets.push(rowData);
          }
        } catch (error) {
          this.addWarning(`Failed to extract data from row: ${error}`);
          CloudLogger.warn('Failed to extract ticket data', {
            category: LogCategory.TICKET_COLLECTION,
            context: {
              stage: 'data_extraction',
            },
            metadata: {
              source: 'hiroshima',
            },
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      return tickets;
    } catch (error) {
      CloudLogger.error('Failed to extract tickets', {
        category: LogCategory.TICKET_COLLECTION,
        context: {
          stage: 'data_extraction',
        },
        metadata: {
          source: 'hiroshima',
        },
        error: {
          message: error instanceof Error ? error.message : String(error),
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

  private async extractRowData(
    rowElement: ElementHandle,
    saleDate: string | undefined,
  ): Promise<HiroshimaRawTicketData | null> {
    try {
      // 1番目のtdから試合情報を取得
      const matchInfo = await this.extractMatchInfo(rowElement);
      if (!matchInfo.date) {
        return null;
      }

      // 日程が未定（候補日が複数、キックオフ時刻未定）の試合は取得しない。確定後に改めて取得する
      if (matchInfo.kickoffUndecided) {
        CloudLogger.info('Skipping Urawa match with undecided kickoff time', {
          category: LogCategory.TICKET_COLLECTION,
          context: {
            stage: 'data_extraction',
          },
          metadata: {
            source: 'hiroshima',
            date: matchInfo.date,
          },
        });
        return null;
      }

      // 対戦相手は既に確認済みなので再度取得
      const opponent = await this.extractOpponent(rowElement);
      if (!opponent) {
        return null;
      }

      // 浦和戦で会場情報が取得できない場合は警告
      if (!matchInfo.venue) {
        this.addWarning('Venue information not found for Urawa match');
      }

      // 販売状況を取得
      const saleStatus = await this.extractText(rowElement, this.config.selectors.ticketStatus);
      if (!saleStatus) {
        this.addWarning('Sale status not found');
        return null;
      }

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
   * HTML例: "2026/27明治安田J1リーグ第1節<br><span>8.8</span> [土]<br>19:15 K.O."
   * 日程未定の例: "...第33節<br>2027年<span>5.3</span> [月・祝]<br>or <span>4</span> [火・祝]<br>キックオフ時刻未定"
   * 会場は現在のページに記載がないため、通常は null になる
   */
  private async extractMatchInfo(rowElement: ElementHandle): Promise<{
    date: string | null;
    time: string | null;
    venue: string | null;
    kickoffUndecided: boolean;
  }> {
    const empty = { date: null, time: null, venue: null, kickoffUndecided: false };
    try {
      const firstTd = await rowElement.$('td:first-child p');
      if (!firstTd) {
        return empty;
      }

      // innerHTML()を使って<br>タグを直接処理
      const innerHTML = await firstTd.innerHTML();
      if (!innerHTML) {
        return empty;
      }

      // <br>タグで分割してHTMLタグを除去
      const lines = innerHTML
        .split(/<br\s*\/?>/i)
        .map((line) => line.replace(/<[^>]*>/g, '').trim())
        .filter((line) => line);

      let date = null;
      let time = null;
      let venue = null;
      let kickoffUndecided = false;

      for (const line of lines) {
        // 日付を抽出（例: "11.9 [日]"）
        const dateMatch = line.match(/(\d{1,2}\.\d{1,2})\s*\[[^\]]+\]/);
        if (dateMatch) {
          date = dateMatch[1];
          continue;
        }

        // 時間を抽出（例: "19:15 K.O."、"13:00K.O."）
        const timeMatch = line.match(/(\d{1,2}:\d{2})\s*K\.O\./);
        if (timeMatch) {
          time = timeMatch[1];
          continue;
        }

        if (line.includes('キックオフ時刻未定')) {
          kickoffUndecided = true;
          continue;
        }

        // 会場を抽出（会場名が単独行で書かれている場合のみ）
        if (line.includes('エディオン') || line.includes('広島')) {
          venue = line;
        }
      }

      return { date, time, venue, kickoffUndecided };
    } catch {
      return empty;
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
   * 7番目のtd（一般販売）から販売日と rowspan を取得
   * 4〜6番目のtdは会員向けの先行販売日なので使わない
   * HTML例: "10/10(金)<br>12:00～"
   * rowspan の後続行（td が 4 つ）には 7 番目の td がないので null を返す
   */
  private async extractSaleDate(
    rowElement: ElementHandle,
  ): Promise<{ value: string | undefined; rowspan: number } | null> {
    try {
      const saleTd = await rowElement.$('td:nth-child(7)');
      if (!saleTd) {
        return null;
      }

      const rowspan = Number(await saleTd.getAttribute('rowspan')) || 1;
      const saleText = (await saleTd.textContent())?.trim();
      return { value: saleText || undefined, rowspan };
    } catch {
      return null;
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
