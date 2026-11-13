import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { NotificationService } from '../NotificationService.ts';
import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import type { NotificationExecutionInput } from '@/application/usecases/results.ts';
import type { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import type { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import type { LineClient, LineMessage } from '@/infrastructure/clients/LineClient.ts';

const ticket = Ticket.fromExisting({
  id: 'test-ticket-123',
  matchName: 'テスト試合',
  matchDate: new Date('2024-03-15T19:00:00+09:00'),
  homeTeam: 'ホームチーム',
  awayTeam: 'アウェイチーム',
  competition: null,
  venue: 'テスト会場',
  saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
  saleEndDate: null,
  ticketUrl: 'https://example.com/ticket',
  ticketTypes: ['一般'],
  createdAt: new Date(),
  updatedAt: new Date(),
  scrapedAt: new Date(),
  saleStatus: 'before_sale',
  notificationScheduled: false,
});

const input: NotificationExecutionInput = {
  ticketId: 'test-ticket-123',
  notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
};

type StubOptions = {
  /** findById が返すチケット */
  ticket?: Ticket | null;
  /** findByTicketId が返す既存の通知 */
  notifications?: Notification[];
  /** broadcast を失敗させるエラー */
  broadcastError?: Error;
};

/**
 * NotificationService の依存をインラインスタブで用意し、呼び出し順を記録する
 * 本番コードはリトライで例外を吸収するため、経路上のメソッドは全部書いておく
 */
function createService(options: StubOptions = {}) {
  const calls: string[] = [];
  const saved: Notification[] = [];
  const updated: Notification[] = [];
  const broadcasts: LineMessage[] = [];
  const delays: number[] = [];

  const ticketRepository = {
    findById: (id: string) => {
      calls.push(`findById:${id}`);
      return Promise.resolve(options.ticket === undefined ? ticket : options.ticket);
    },
  } satisfies Partial<TicketRepository>;

  const notificationRepository = {
    findByTicketId: (ticketId: string) => {
      calls.push(`findByTicketId:${ticketId}`);
      return Promise.resolve(options.notifications ?? []);
    },
    save: (notification: Notification) => {
      calls.push('save');
      saved.push(notification);
      return Promise.resolve();
    },
    update: (notification: Notification) => {
      calls.push(`update:${notification.status}`);
      updated.push(notification);
      return Promise.resolve();
    },
  } satisfies Partial<NotificationRepository>;

  const lineClient = {
    broadcast: (message: LineMessage) => {
      calls.push('broadcast');
      broadcasts.push(message);
      return options.broadcastError ? Promise.reject(options.broadcastError) : Promise.resolve();
    },
  } satisfies Partial<LineClient>;

  const service = new NotificationService(
    notificationRepository as unknown as NotificationRepository,
    ticketRepository as unknown as TicketRepository,
    lineClient as unknown as LineClient,
  );
  // リトライ間の待ちを実際には待たずに記録する（private の delay への依存）
  // #247 でプロセス内のリトライが廃止されるまでの措置
  (service as unknown as { delay: (ms: number) => Promise<void> }).delay = (ms) => {
    delays.push(ms);
    return Promise.resolve();
  };

  return { service, calls, saved, updated, broadcasts, delays };
}

function createNotification(status: 'scheduled' | 'sent'): Notification {
  return new Notification({
    id: 'notification-1',
    ticketId: 'test-ticket-123',
    notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    scheduledAt: new Date(),
    sentAt: status === 'sent' ? new Date() : null,
    status,
    errorMessage: null,
    cloudTaskId: null,
    createdAt: new Date(),
    updatedAt: null,
  });
}

Deno.test('NotificationService.sendScheduledNotification', async (t) => {
  await t.step('チケットがなければ例外を投げ、LINE には送らない', async () => {
    const { service, calls } = createService({ ticket: null });

    await assertRejects(
      () => service.sendScheduledNotification(input),
      Error,
      'Ticket not found: test-ticket-123',
    );
    assertEquals(calls, ['findById:test-ticket-123']);
  });

  await t.step('通知記録がなければ作成してから送信し、sent に更新する', async () => {
    const { service, calls, saved, updated, broadcasts } = createService();

    await service.sendScheduledNotification(input);

    assertEquals(calls, [
      'findById:test-ticket-123',
      'findByTicketId:test-ticket-123',
      'save',
      'broadcast',
      'update:sent',
    ]);
    assertEquals(saved[0].ticketId, 'test-ticket-123');
    assertEquals(saved[0].notificationType, NOTIFICATION_TYPES.DAY_BEFORE);
    assertEquals(saved[0].status, 'scheduled');
    assertEquals(updated[0].id, saved[0].id);
    assertEquals(broadcasts.length, 1);
  });

  await t.step('scheduled の通知記録があれば作成せずに送信する', async () => {
    const { service, calls, updated } = createService({
      notifications: [createNotification('scheduled')],
    });

    await service.sendScheduledNotification(input);

    assertEquals(calls, [
      'findById:test-ticket-123',
      'findByTicketId:test-ticket-123',
      'broadcast',
      'update:sent',
    ]);
    assertEquals(updated[0].id, 'notification-1');
  });

  await t.step('送信済みの通知記録があれば何も送らない', async () => {
    const { service, calls } = createService({
      notifications: [createNotification('sent')],
    });

    await service.sendScheduledNotification(input);

    assertEquals(calls, ['findById:test-ticket-123', 'findByTicketId:test-ticket-123']);
  });

  await t.step('broadcast が 3 回失敗したら failed に更新し、例外は投げない', async () => {
    const { service, calls, updated, delays } = createService({
      broadcastError: new Error('LINE down'),
    });

    await service.sendScheduledNotification(input);

    assertEquals(calls, [
      'findById:test-ticket-123',
      'findByTicketId:test-ticket-123',
      'save',
      'broadcast',
      'broadcast',
      'broadcast',
      'update:failed',
    ]);
    assertEquals(updated[0].errorMessage, 'LINE down');
    // 1 秒・2 秒の指数バックオフで待つ（3 回目の失敗の後は待たない）
    assertEquals(delays, [1000, 2000]);
  });
});

Deno.test('NotificationService.sendTicketSummary', async (t) => {
  await t.step('サマリーを 1 回 broadcast する', async () => {
    const { service, broadcasts } = createService();

    await service.sendTicketSummary([ticket]);

    assertEquals(broadcasts.length, 1);
  });

  await t.step('broadcast が失敗したら包み直して投げる', async () => {
    const { service } = createService({ broadcastError: new Error('LINE down') });

    await assertRejects(
      () => service.sendTicketSummary([ticket]),
      Error,
      'Ticket summary notification failed: LINE down',
    );
  });
});
