import { assertEquals } from 'std/assert/mod.ts';
import { HiroshimaDataExtractor } from '../HiroshimaDataExtractor.ts';
import { HIROSHIMA_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/hiroshima/HiroshimaConfig.ts';
import { MockPlaywrightClient } from '@/shared/testing/mocks/MockPlaywrightClient.ts';

Deno.test('HiroshimaDataExtractor', async (t) => {
  const extractor = new HiroshimaDataExtractor(
    HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
    HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
  );

  await t.step('extractTickets メソッドが呼び出し可能', async () => {
    const mockClient = new MockPlaywrightClient();
    await mockClient.launch();
    const mockPage = await mockClient.createPage();

    // Empty data case - should return empty array without errors
    const tickets = await extractor.extractTickets(mockPage);
    assertEquals(Array.isArray(tickets), true);
  });

  await t.step('constructor が正しく動作する', () => {
    // Should not throw error
    const newExtractor = new HiroshimaDataExtractor(
      HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
      HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
    );
    assertEquals(typeof newExtractor, 'object');
  });

  await t.step('getAndClearWarnings が動作する', async () => {
    const mockClient = new MockPlaywrightClient();
    await mockClient.launch();
    const mockPage = await mockClient.createPage();

    await extractor.extractTickets(mockPage);
    const warnings = extractor.getAndClearWarnings();
    assertEquals(Array.isArray(warnings), true);

    // 警告がクリアされることを確認
    const warningsAfterClear = extractor.getAndClearWarnings();
    assertEquals(warningsAfterClear.length, 0);
  });
});

/**
 * 試合行のセル（サンフレッチェ広島サイトの td）
 * - child: セル直下の要素（span / a / img / p）
 */
type CellStub = {
  text: string;
  rowspan?: number;
  child?: 'span' | 'a' | 'img' | 'p';
  alt?: string;
  html?: string;
};

function elementStub(text: string, attrs: Record<string, string> = {}, html = text) {
  return {
    textContent: () => Promise.resolve(text),
    innerHTML: () => Promise.resolve(html),
    getAttribute: (name: string) => Promise.resolve(attrs[name] ?? null),
  };
}

/**
 * extractor が使う形のセレクタ（`td:first-child p`、`td:nth-child(n) span`、`td:last-child` など）に答える行のスタブ
 */
function rowStub(cells: CellStub[]) {
  return {
    $: (selector: string) => {
      const m = selector.match(/^td:(first-child|last-child|nth-child\((\d+)\))(?: (.+))?$/);
      if (!m) return Promise.resolve(null);
      const index = m[1] === 'first-child'
        ? 0
        : m[1] === 'last-child'
        ? cells.length - 1
        : Number(m[2]) - 1;
      const cell = cells[index];
      if (!cell) return Promise.resolve(null);
      const descendant = m[3];
      if (!descendant) {
        return Promise.resolve(
          elementStub(cell.text, cell.rowspan ? { rowspan: String(cell.rowspan) } : {}),
        );
      }
      if (descendant !== cell.child) return Promise.resolve(null);
      return Promise.resolve(elementStub(cell.text, { alt: cell.alt ?? '' }, cell.html));
    },
  };
}

const dateCell = (date: string): CellStub => ({
  text: '',
  child: 'p',
  html:
    `2026/27明治安田J1リーグ第33節<br>${date} [日]<br>14:00K.O.<br>エディオンピースウイング広島`,
});
const teamCell = (name: string): CellStub => ({ text: name, child: 'img', alt: name });
const priceCell: CellStub = { text: '☆☆☆☆', child: 'a' };
const status = (text: string, child: 'span' | 'a'): CellStub => ({ text, child });

/** 販売日の列（4〜7 列目）を持つ 8 列の行 */
const fullRow = (team: string, date: string, saleDates: string[], st: CellStub, rowspan?: number) =>
  rowStub([
    dateCell(date),
    teamCell(team),
    priceCell,
    ...saleDates.map((text) => ({ text, rowspan })),
    st,
  ]);

/** 販売日の列を先頭行と rowspan で共有する 4 列の行 */
const groupedRow = (team: string, date: string, st: CellStub) =>
  rowStub([dateCell(date), teamCell(team), priceCell, st]);

function pageStub(rows: ReturnType<typeof rowStub>[]) {
  return {
    $$: (selector: string) => Promise.resolve(selector === 'tr.cmn--btr' ? rows : []),
  } as unknown as Parameters<HiroshimaDataExtractor['extractTickets']>[0];
}

const SALE_DATES = ['10/20(火)12:00', '10/21(水)12:00', '10/22(木)12:00', '10/23(金)12:00'];

Deno.test('HiroshimaDataExtractor - 販売状況の取得', async (t) => {
  const cases: Array<{ name: string; row: ReturnType<typeof rowStub>; expected: string }> = [
    {
      name: '8 列・販売開始前（span）',
      row: fullRow(
        '浦和レッズ',
        '5.3',
        ['未定', '未定', '未定', '未定'],
        status('販売開始前', 'span'),
      ),
      expected: '販売開始前',
    },
    {
      name: '8 列・WEBで購入（a）',
      row: fullRow('浦和レッズ', '5.3', SALE_DATES, status('WEBで購入', 'a')),
      expected: 'WEBで購入',
    },
    {
      name: '8 列・販売終了（span）',
      row: fullRow('浦和レッズ', '5.3', SALE_DATES, status('販売終了', 'span')),
      expected: '販売終了',
    },
    {
      name: '8 列・全席種完売（span）',
      row: fullRow('浦和レッズ', '5.3', SALE_DATES, status('全席種完売', 'span')),
      expected: '全席種完売',
    },
    {
      name: '4 列（rowspan の後続行）・WEBで購入（a）',
      row: groupedRow('浦和レッズ', '5.3', status('WEBで購入', 'a')),
      expected: 'WEBで購入',
    },
    {
      name: '4 列（rowspan の後続行）・販売終了（span）',
      row: groupedRow('浦和レッズ', '5.3', status('販売終了', 'span')),
      expected: '販売終了',
    },
  ];

  for (const c of cases) {
    await t.step(c.name, async () => {
      const extractor = new HiroshimaDataExtractor(
        HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
        HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
      );
      const tickets = await extractor.extractTickets(pageStub([c.row]));

      assertEquals(tickets.length, 1);
      assertEquals(tickets[0].saleStatus, c.expected);
    });
  }
});

Deno.test('HiroshimaDataExtractor - 販売日（6 列目）の取得', async (t) => {
  const extract = async (rows: ReturnType<typeof rowStub>[]) => {
    const extractor = new HiroshimaDataExtractor(
      HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
      HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
    );
    return await extractor.extractTickets(pageStub(rows));
  };

  await t.step('8 列の行は自分の 6 列目を使う', async () => {
    const tickets = await extract([
      fullRow('浦和レッズ', '11.21', SALE_DATES, status('WEBで購入', 'a')),
    ]);
    assertEquals(tickets[0].saleDate, '10/22(木)12:00');
  });

  await t.step('rowspan の後続行は、グループ先頭行の 6 列目を引き継ぐ', async () => {
    const tickets = await extract([
      fullRow('横浜F・マリノス', '11.21', SALE_DATES, status('WEBで購入', 'a'), 3),
      groupedRow('ヴィッセル神戸', '12.6', status('WEBで購入', 'a')),
      groupedRow('浦和レッズ', '12.13', status('WEBで購入', 'a')),
    ]);
    assertEquals(tickets.length, 1);
    assertEquals(tickets[0].saleDate, '10/22(木)12:00');
  });

  await t.step('rowspan の範囲を過ぎた 4 列の行は販売日なし', async () => {
    const tickets = await extract([
      fullRow('横浜F・マリノス', '11.21', SALE_DATES, status('WEBで購入', 'a'), 2),
      groupedRow('ヴィッセル神戸', '12.6', status('WEBで購入', 'a')),
      groupedRow('浦和レッズ', '12.13', status('WEBで購入', 'a')),
    ]);
    assertEquals(tickets.length, 1);
    assertEquals(tickets[0].saleDate, undefined);
  });

  await t.step('rowspan のない 8 列の行は後続行に引き継がない', async () => {
    const tickets = await extract([
      fullRow(
        'セレッソ大阪',
        '9.12',
        ['8/4', '8/5', '8/6(木)12:00', '8/7'],
        status('販売終了', 'span'),
      ),
      groupedRow('浦和レッズ', '12.13', status('WEBで購入', 'a')),
    ]);
    assertEquals(tickets[0].saleDate, undefined);
  });
});
