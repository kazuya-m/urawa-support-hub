import { assertEquals } from 'std/assert/mod.ts';
import { HiroshimaScrapingService } from '../HiroshimaScrapingService.ts';
import type { BrowserManager } from '@/infrastructure/services/scraping/shared/BrowserManager.ts';

// コンストラクタの確認のみで、ブラウザは操作しない
const browserManagerStub = {} as unknown as BrowserManager;

Deno.test('HiroshimaScrapingService', async (t) => {
  await t.step('serviceName が正しく設定されている', () => {
    const service = new HiroshimaScrapingService(browserManagerStub);
    assertEquals(service.serviceName, 'Hiroshima');
  });

  await t.step('constructor が正しく動作する', () => {
    // Should not throw error
    const service = new HiroshimaScrapingService(browserManagerStub);
    assertEquals(service.serviceName, 'Hiroshima');
    assertEquals(typeof service.collectTickets, 'function');
  });

  await t.step('インターフェースが正しく実装されている', () => {
    const service = new HiroshimaScrapingService(browserManagerStub);

    // ISiteScrapingServiceのプロパティが存在することを確認
    assertEquals(typeof service.serviceName, 'string');
    assertEquals(typeof service.collectTickets, 'function');
  });
});
