/**
 * テスト用の共通フィクスチャデータ
 */

import { Ticket } from '@/domain/entities/Ticket.ts';

/**
 * テスト用チケット生成のベースオプション
 */
export interface TestTicketOptions {
  suffix?: string;
  dayOffset?: number;
  matchName?: string;
  venue?: string;
}

/**
 * テスト用チケットデータのベースセット
 */
export const TEST_TICKETS = {
  upsert001: {
    id: 'test-upsert-001',
    matchName: 'ガンバ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-03-15T19:30:00+09:00'),
    homeTeam: 'ガンバ大阪',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date('2025-03-01T10:00:00+09:00'),
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test-upsert',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    scrapedAt: new Date(),
    saleStatus: 'before_sale' as const,
  },
  idempotent001: {
    id: 'test-idempotent-001',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date('2025-04-20T19:00:00+09:00'),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date('2025-04-05T10:00:00+09:00'),
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/fc-tokyo',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale' as const,
  },
  unique001: {
    id: 'unique-test-001',
    matchName: 'セレッソ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-05-10T19:30:00+09:00'),
    venue: 'ヤンマースタジアム長居',
    homeTeam: 'セレッソ大阪',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date('2025-04-25T10:00:00+09:00'),
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/cerezo',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale' as const,
  },
  unique002: {
    id: 'unique-test-002',
    matchName: 'セレッソ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-05-10T19:30:00+09:00'),
    venue: 'ヤンマースタジアム長居',
    homeTeam: 'セレッソ大阪',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date('2025-04-25T10:00:00+09:00'),
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/cerezo',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale' as const,
  },
};

/**
 * テストで使用するすべてのIDを取得
 */
export function getAllTestIds(): string[] {
  return Object.values(TEST_TICKETS).map((ticket) => ticket.id);
}

/**
 * 特定のテストグループのIDを取得
 */
export function getTestIdsByGroup(group: 'upsert' | 'idempotent' | 'unique'): string[] {
  return Object.entries(TEST_TICKETS)
    .filter(([key]) => key.startsWith(group))
    .map(([, ticket]) => ticket.id);
}

/**
 * 既存のテストチケットエンティティを作成
 */
export function createTestTicket(key: keyof typeof TEST_TICKETS): Ticket {
  return Ticket.fromExisting(TEST_TICKETS[key]);
}

/**
 * 動的なテストチケットを生成（Integration テスト用）
 * 各テストで一意のIDを持つチケットを効率的に作成
 */
export async function createDynamicTestTicket(options: TestTicketOptions = {}): Promise<Ticket> {
  const { suffix = '', dayOffset, matchName, venue } = options;

  const now = new Date();

  // シンプルなオフセット計算：suffix文字列の長さとhashCodeを使用
  const calculatedOffset = dayOffset ?? (suffix.length * 7 + simpleHash(suffix)) % 90 + 10;

  const futureMatchDate = new Date(now);
  futureMatchDate.setMonth(futureMatchDate.getMonth() + 2);
  futureMatchDate.setDate(futureMatchDate.getDate() + calculatedOffset);

  const futureSaleDate = new Date(now);
  futureSaleDate.setMonth(futureSaleDate.getMonth() + 1);

  return await Ticket.createNew({
    matchName: matchName ?? `FC東京 vs 浦和レッズ${suffix ? ' - ' + suffix : ''}`,
    matchDate: futureMatchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: futureSaleDate,
    venue: venue ?? '味の素スタジアム',
    ticketTypes: ['ビジター席', '一般販売'],
    ticketUrl: `https://example.com/tickets/test${suffix ? '-' + suffix : ''}`,
    scrapedAt: new Date(),
    saleStatus: 'before_sale' as const,
    notificationScheduled: false,
  });
}

/**
 * シンプルなハッシュ関数（テスト用）
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}
