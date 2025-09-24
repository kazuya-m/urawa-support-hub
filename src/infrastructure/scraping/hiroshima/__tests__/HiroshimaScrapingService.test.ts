import { assertEquals } from 'std/assert/mod.ts';
import { HiroshimaScrapingService } from '../HiroshimaScrapingService.ts';
import { MockBrowserManager } from '../../jleague/__tests__/mocks/MockBrowserManager.ts';

Deno.test('HiroshimaScrapingService', async (t) => {
  await t.step('serviceName が正しく設定されている', () => {
    const mockBrowserManager = new MockBrowserManager();
    const service = new HiroshimaScrapingService(mockBrowserManager);
    assertEquals(service.serviceName, 'Hiroshima');
  });

  await t.step('constructor が正しく動作する', () => {
    const mockBrowserManager = new MockBrowserManager();

    // Should not throw error
    const service = new HiroshimaScrapingService(mockBrowserManager);
    assertEquals(service.serviceName, 'Hiroshima');
    assertEquals(typeof service.collectTickets, 'function');
  });

  await t.step('インターフェースが正しく実装されている', () => {
    const mockBrowserManager = new MockBrowserManager();
    const service = new HiroshimaScrapingService(mockBrowserManager);

    // ISiteScrapingServiceのプロパティが存在することを確認
    assertEquals(typeof service.serviceName, 'string');
    assertEquals(typeof service.collectTickets, 'function');
  });
});
