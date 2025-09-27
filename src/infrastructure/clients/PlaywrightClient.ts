import { Browser, chromium, Page } from 'playwright';
import { IPage, IPlaywrightClient } from '@/application/interfaces/clients/IPlaywrightClient.ts';

/**
 * Playwrightページのラッパー実装
 */
class PlaywrightPage implements IPage {
  constructor(private page: Page) {}

  async $eval<R>(selector: string, pageFunction: (element: Element) => R): Promise<R> {
    return await this.page.$eval(selector, pageFunction);
  }

  async $$eval<R>(selector: string, pageFunction: (elements: Element[]) => R): Promise<R> {
    return await this.page.$$eval(selector, pageFunction);
  }

  async $(selector: string) {
    return await this.page.$(selector);
  }

  async $$(selector: string) {
    return await this.page.$$(selector);
  }

  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async setExtraHTTPHeaders(headers: Record<string, string>): Promise<void> {
    await this.page.setExtraHTTPHeaders(headers);
  }

  async setViewportSize(size: { width: number; height: number }): Promise<void> {
    await this.page.setViewportSize(size);
  }

  async waitForTimeout(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async waitForSelector(selector: string, options?: { timeout?: number }) {
    return await this.page.waitForSelector(selector, options);
  }

  async evaluate<R>(pageFunction: () => R): Promise<R> {
    return await this.page.evaluate(pageFunction);
  }

  async textContent(): Promise<string | null> {
    return await this.page.textContent('body');
  }
}

/**
 * Playwright具象実装クライアント
 */
export class PlaywrightClient implements IPlaywrightClient {
  private browser: Browser | null = null;

  async launch(timeout = 30000): Promise<void> {
    this.browser = await chromium.launch({
      headless: true, // 一旦headlessに戻す
      timeout,
    });
  }

  async createPage(timeout = 30000): Promise<IPage> {
    if (!this.browser) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();

    // タイムアウト設定
    page.setDefaultTimeout(timeout);

    return new PlaywrightPage(page);
  }

  async navigateToPage(page: IPage, url: string): Promise<void> {
    const playwrightPage = (page as PlaywrightPage)['page'];
    await playwrightPage.goto(url, { waitUntil: 'domcontentloaded' });
    // 追加で短い待機を入れる
    await playwrightPage.waitForTimeout(1000);
  }

  async waitForContent(page: IPage, selector: string, timeout = 5000): Promise<void> {
    await page.waitForSelector(selector, { timeout });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
