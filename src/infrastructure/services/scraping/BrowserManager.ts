import { Browser, chromium, Page } from 'npm:playwright@1.40.0';

export class BrowserManager {
  private browser: Browser | null = null;

  async launch(timeout: number): Promise<void> {
    // 開発環境ではシステムのChromeを使用
    const isDevelopment = Deno.env.get('NODE_ENV') !== 'production';
    const debugMode = Deno.env.get('DEBUG_SCRAPING') === 'true';

    this.browser = await chromium.launch({
      channel: isDevelopment ? 'chrome' : undefined, // 開発環境ではChromeを使用
      headless: !debugMode, // デバッグモード時はGUI表示
      timeout,
    });
  }

  async createPage(defaultTimeout: number): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    page.setDefaultTimeout(defaultTimeout);
    return page;
  }

  async navigateToPage(page: Page, url: string): Promise<void> {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
  }

  async clickTab(page: Page, selectors: string[], timeout: number): Promise<boolean> {
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout });

        const isActive = await page.$eval(selector, (element) => {
          return element.classList?.contains('active') ||
            element.getAttribute('aria-selected') === 'true' ||
            element.parentElement?.classList?.contains('active');
        }).catch(() => false) as boolean;

        if (!isActive) {
          await page.click(selector);
          return true;
        }

        return true;
      } catch (_error) {
        console.warn(`Tab selector failed: ${selector}`);
      }
    }

    return false;
  }

  async waitForContent(page: Page, selectors: string[], waitTime: number = 1000): Promise<boolean> {
    await page.waitForTimeout(waitTime);

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return true;
      } catch (_error) {
        // Continue to next selector
        continue;
      }
    }

    return false;
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.warn('Failed to close browser:', error);
      } finally {
        this.browser = null;
      }
    }
  }

  /**
   * ブラウザが起動しているかチェック
   */
  isRunning(): boolean {
    return this.browser !== null;
  }
}
