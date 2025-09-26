import { IPage, IPlaywrightClient } from '@/infrastructure/clients/interfaces/IPlaywrightClient.ts';
import { IBrowserManager } from '@/infrastructure/services/scraping/shared/interfaces/IBrowserManager.ts';
import { PlaywrightClient } from '@/infrastructure/clients/PlaywrightClient.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';

export class BrowserManager implements IBrowserManager {
  private playwrightClient: IPlaywrightClient;
  private isLaunched = false;

  constructor(playwrightClient?: IPlaywrightClient) {
    this.playwrightClient = playwrightClient ?? new PlaywrightClient();
  }

  async launch(timeout: number): Promise<void> {
    // 既にブラウザが起動している場合はスキップ
    if (this.isLaunched) {
      CloudLogger.debug('Browser already launched, skipping', {
        category: LogCategory.TICKET_COLLECTION,
      });
      return;
    }

    await this.playwrightClient.launch(timeout);
    this.isLaunched = true;
  }

  async createPage(defaultTimeout: number): Promise<IPage> {
    if (!this.isLaunched) {
      throw new Error('Browser not initialized. Call launch() first.');
    }

    return await this.playwrightClient.createPage(defaultTimeout);
  }

  async navigateToPage(page: IPage, url: string): Promise<void> {
    await this.playwrightClient.navigateToPage(page, url);
    await page.waitForTimeout(2000);
  }

  async waitForContent(
    page: IPage,
    selectors: string[],
    waitTime: number = 1000,
  ): Promise<boolean> {
    await page.waitForTimeout(waitTime);

    for (const selector of selectors) {
      try {
        await this.playwrightClient.waitForContent(page, selector, 5000);
        return true;
      } catch (_error) {
        // Continue to next selector
        continue;
      }
    }

    return false;
  }

  async close(): Promise<void> {
    if (this.isLaunched) {
      try {
        await this.playwrightClient.close();
      } catch (error) {
        CloudLogger.warn('Failed to close browser', {
          category: LogCategory.SYSTEM,
          context: {
            stage: 'browser_cleanup',
          },
          error: toErrorInfo(error, ErrorCodes.BROWSER_CLOSE_ERROR, true),
        });
      } finally {
        this.isLaunched = false;
      }
    }
  }

  isRunning(): boolean {
    return this.isLaunched;
  }
}
