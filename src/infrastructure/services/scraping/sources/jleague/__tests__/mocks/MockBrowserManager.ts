import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';
import { IBrowserManager } from '@/application/interfaces/clients/IBrowserManager.ts';

/**
 * テスト用 BrowserManager Mock
 * IBrowserManagerインターフェースを実装したシンプルなMock
 */
export class MockBrowserManager implements IBrowserManager {
  private mockPage: IPage | null = null;

  async launch(_timeout: number): Promise<void> {
    // Mock実装：何もしない
  }

  createPage(_defaultTimeout: number): Promise<IPage> {
    if (!this.mockPage) {
      throw new Error('Mock page not set. Call setMockPage() first.');
    }
    return Promise.resolve(this.mockPage);
  }

  async navigateToPage(_page: IPage, _url: string): Promise<void> {
    // Mock実装：何もしない
  }

  waitForContent(_page: IPage, _selectors: string[], _waitTime?: number): Promise<boolean> {
    return Promise.resolve(true); // Mock実装：常に成功
  }

  async close(): Promise<void> {
    // Mock実装：何もしない
  }

  isRunning(): boolean {
    return false; // Mock実装：常に停止状態
  }

  setMockPage(page: IPage): void {
    this.mockPage = page;
  }
}
