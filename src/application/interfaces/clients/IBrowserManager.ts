import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';

/**
 * ブラウザ管理のインターフェース
 * DI用：実装とMockの両方で実装可能
 */
export interface IBrowserManager {
  launch(timeout: number): Promise<void>;
  createPage(defaultTimeout: number): Promise<IPage>;
  navigateToPage(page: IPage, url: string): Promise<void>;
  waitForContent(page: IPage, selectors: string[], waitTime?: number): Promise<boolean>;
  close(): Promise<void>;
  isRunning(): boolean;
}
