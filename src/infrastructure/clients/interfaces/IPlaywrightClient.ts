import type { ElementHandle } from 'playwright';

/**
 * Playwrightページの抽象化インターフェース
 * Playwrightの型を直接利用して、不要な型の増殖を防ぐ
 */
export interface IPage {
  $eval<R>(selector: string, pageFunction: (element: Element) => R): Promise<R>;
  $$eval<R>(selector: string, pageFunction: (elements: Element[]) => R): Promise<R>;
  $(selector: string): Promise<ElementHandle | null>;
  $$(selector: string): Promise<ElementHandle[]>;
  click(selector: string): Promise<void>;
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>;
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<ElementHandle | null>;
  evaluate<R>(pageFunction: () => R): Promise<R>;
  textContent(): Promise<string | null>;
}

/**
 * Playwrightクライアントの抽象化インターフェース
 */
export interface IPlaywrightClient {
  /**
   * ブラウザを起動
   */
  launch(timeout?: number): Promise<void>;

  /**
   * 新しいページを作成
   */
  createPage(timeout?: number): Promise<IPage>;

  /**
   * 指定URLにナビゲート
   */
  navigateToPage(page: IPage, url: string): Promise<void>;

  /**
   * 要素が表示されるまで待機
   */
  waitForContent(page: IPage, selector: string, timeout?: number): Promise<void>;

  /**
   * ブラウザを終了
   */
  close(): Promise<void>;
}
