/**
 * テストデータ生成ユーティリティ
 */

import { Ticket } from '@/domain/entities/Ticket.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';
// import { NotificationHistory } from '@/domain/entities/NotificationHistory.ts';
// import { NotificationType } from '@/domain/config/NotificationConfig.ts';

/**
 * テスト用のTicketエンティティを作成
 */
export function createTestTicket(overrides: Partial<{
  id: string;
  matchName: string;
  matchDate: Date;
  homeTeam?: string;
  awayTeam?: string;
  competition?: string;
  saleStartDate: Date | null;
  saleEndDate?: Date;
  venue?: string;
  ticketTypes?: string[];
  ticketUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  scrapedAt: Date;
  saleStatus?: SaleStatus;
  notificationScheduled?: boolean;
}> = {}): Ticket {
  const defaultProps = {
    id: 'test-ticket-1',
    matchName: 'テストマッチ vs FC東京',
    matchDate: new Date('2025-10-01T15:00:00+09:00'),
    homeTeam: '浦和レッズ',
    awayTeam: 'FC東京',
    venue: 'さいたまスタジアム2002',
    saleStartDate: new Date('2025-09-25T10:00:00+09:00'),
    saleEndDate: new Date('2025-10-01T12:00:00+09:00'),
    saleStatus: 'on_sale' as const,
    ticketUrl: 'https://example.com/tickets/test-ticket-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    ...overrides,
  };

  return Ticket.fromExisting(defaultProps);
}

/**
 * テスト用のNotificationHistoryエンティティを作成
 * 注意: NotificationHistoryエンティティが実装されたら有効化
 */
/*
export function createTestNotificationHistory(
  overrides: Partial<NotificationHistory> = {}
): NotificationHistory {
  const defaultHistory: NotificationHistory = {
    id: 'test-notification-1',
    ticketId: 'test-ticket-1',
    notificationType: 'day_before' as NotificationType,
    scheduledTime: new Date('2025-09-24T20:00:00+09:00'),
    sentAt: new Date('2025-09-24T20:00:15+09:00'),
    status: 'sent',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaultHistory, ...overrides };
}
*/

/**
 * 複数のテストチケットを作成
 */
export function createTestTickets(count: number): Ticket[] {
  return Array.from({ length: count }, (_, index) =>
    createTestTicket({
      id: `test-ticket-${index + 1}`,
      matchName: `テストマッチ${index + 1} vs FC東京`,
      matchDate: new Date(`2025-10-${String(index + 1).padStart(2, '0')}T15:00:00+09:00`),
    }));
}
