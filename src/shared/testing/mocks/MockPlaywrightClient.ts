import { IPage, IPlaywrightClient } from '@/infrastructure/clients/interfaces/IPlaywrightClient.ts';
import type { ElementHandle } from 'playwright';

/**
 * テスト用MockPage実装
 */
class MockPage implements IPage {
  private mockData: Record<string, string | string[]> = {};

  constructor(mockData: Record<string, string | string[]> = {}) {
    this.mockData = mockData;
  }

  setMockData(selector: string, data: string | string[]): void {
    this.mockData[selector] = data;
  }

  $eval<R>(selector: string, pageFunction: (element: Element) => R): Promise<R> {
    const mockValue = this.mockData[selector];
    const mockElement = {
      textContent: typeof mockValue === 'string' ? mockValue : null,
      getAttribute: () => typeof mockValue === 'string' ? mockValue : null,
      href: typeof mockValue === 'string' ? mockValue : undefined,
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Element;
    return Promise.resolve(pageFunction(mockElement));
  }

  $$eval<R>(selector: string, pageFunction: (elements: Element[]) => R): Promise<R> {
    const mockValue = this.mockData[selector];
    const mockElements = Array.isArray(mockValue)
      ? mockValue.map((val) => ({
        textContent: val,
        getAttribute: () => val,
        querySelector: () => null,
        querySelectorAll: () => [],
      } as unknown as Element))
      : [];
    return Promise.resolve(pageFunction(mockElements));
  }

  $(_selector: string): Promise<ElementHandle | null> {
    // Mock implementation returns null for simplicity
    return Promise.resolve(null);
  }

  $$(_selector: string): Promise<ElementHandle[]> {
    // Mock implementation returns empty array for simplicity
    return Promise.resolve([]);
  }

  async click(_selector: string): Promise<void> {
    // Mock implementation - do nothing
  }

  async setExtraHTTPHeaders(_headers: Record<string, string>): Promise<void> {
    // Mock implementation - do nothing
  }

  async setViewportSize(_size: { width: number; height: number }): Promise<void> {
    // Mock implementation - do nothing
  }

  async waitForTimeout(_ms: number): Promise<void> {
    // Mock implementation - do nothing (no actual wait)
  }

  waitForSelector(
    selector: string,
    _options?: { timeout?: number },
  ): Promise<ElementHandle | null> {
    return this.$(selector);
  }

  evaluate<R>(pageFunction: () => R): Promise<R> {
    return Promise.resolve(pageFunction());
  }

  textContent(): Promise<string | null> {
    return Promise.resolve(this.mockData['body'] as string || null);
  }
}

/**
 * テスト用MockPlaywrightClient実装
 */
export class MockPlaywrightClient implements IPlaywrightClient {
  private mockPageData: Record<string, string | string[]> = {};
  private isLaunched = false;
  private mockPages: MockPage[] = [];

  setMockPageData(data: Record<string, string | string[]>): void {
    this.mockPageData = data;
  }

  setMockTicketData(tickets: Array<{ selector: string; data: string | string[] }>): void {
    tickets.forEach((ticket) => {
      this.mockPageData[ticket.selector] = ticket.data;
    });
  }

  launch(_timeout?: number): Promise<void> {
    this.isLaunched = true;
    return Promise.resolve();
  }

  createPage(_timeout?: number): Promise<IPage> {
    if (!this.isLaunched) {
      throw new Error('Mock browser not launched. Call launch() first.');
    }

    const mockPage = new MockPage(this.mockPageData);
    this.mockPages.push(mockPage);
    return Promise.resolve(mockPage);
  }

  async navigateToPage(_page: IPage, _url: string): Promise<void> {
    // Mock implementation - do nothing but could validate URL if needed
  }

  async waitForContent(_page: IPage, _selector: string, _timeout?: number): Promise<void> {
    // Mock implementation - do nothing
  }

  close(): Promise<void> {
    this.isLaunched = false;
    this.mockPages = [];
    return Promise.resolve();
  }

  // Test helper methods
  reset(): void {
    this.mockPageData = {};
    this.isLaunched = false;
    this.mockPages = [];
  }

  getCreatedPagesCount(): number {
    return this.mockPages.length;
  }
}
