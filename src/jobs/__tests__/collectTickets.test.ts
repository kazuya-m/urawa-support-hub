import { assert, assertEquals, assertRejects } from 'std/assert/mod.ts';
import { collectTickets, type CollectTicketsDeps } from '../collectTickets.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { Notification } from '@/domain/entities/Notification.ts';
import type { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import { AppError, DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';

type StubOptions = {
  /** 収集結果。Error を渡すと collectAllTickets が reject する */
  collected?: Ticket[] | Error;
  /** findByIds が返す既存チケット（キーは検索 ID）。Error を渡すと reject する */
  existing?: Map<string, Ticket> | Error;
  /** upsertMany を失敗させる */
  upsertManyError?: Error;
};

/**
 * collectTickets の依存をインラインスタブで用意し、呼び出しを記録する
 * 本番コードはスケジューリングや upsert の例外を握りつぶすため、経路上のメソッドは型どおり全部書く
 */
function createDeps(options: StubOptions = {}) {
  const calls = {
    findByIds: [] as string[][],
    upsertMany: [] as Ticket[][],
    upsert: [] as Ticket[],
    findByTicketId: [] as string[],
    scheduleNotifications: [] as { ticket: Ticket; times: NotificationTiming[] }[],
    cancelNotifications: [] as string[][],
  };

  const deps: CollectTicketsDeps = {
    ticketCollectionService: {
      collectAllTickets: () =>
        options.collected instanceof Error
          ? Promise.reject(options.collected)
          : Promise.resolve(options.collected ?? []),
    },
    ticketRepository: {
      findByIds: (ids) => {
        calls.findByIds.push(ids);
        if (options.existing instanceof Error) return Promise.reject(options.existing);
        const map = new Map<string, Ticket>();
        for (const [id, ticket] of options.existing ?? []) {
          if (ids.includes(id)) map.set(id, ticket);
        }
        return Promise.resolve(map);
      },
      upsertMany: (tickets) => {
        calls.upsertMany.push(tickets);
        if (options.upsertManyError) return Promise.reject(options.upsertManyError);
        return Promise.resolve(tickets);
      },
      upsert: (ticket) => {
        calls.upsert.push(ticket);
        return Promise.resolve(ticket);
      },
    },
    notificationRepository: {
      findByTicketId: (ticketId) => {
        calls.findByTicketId.push(ticketId);
        return Promise.resolve([] as Notification[]);
      },
      update: () => Promise.resolve(),
    },
    notificationSchedulerService: {
      scheduleNotifications: (ticket, times) => {
        calls.scheduleNotifications.push({ ticket, times });
        return Promise.resolve();
      },
      cancelNotifications: (taskIds) => {
        calls.cancelNotifications.push(taskIds);
        return Promise.resolve();
      },
    },
  };

  return { deps, calls };
}

Deno.test('collectTickets', async (t) => {
  await t.step('should execute successfully with mock tickets', async () => {
    const mockTicket = Ticket.fromExisting({
      id: 'test-ticket-1',
      matchName: 'Test Match',
      matchDate: new Date('2024-12-01'),
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      competition: 'J1 League',
      venue: 'Test Stadium',
      ticketTypes: ['General', 'Premium'],
      ticketUrl: 'https://test.example.com/tickets/1',
      saleStartDate: new Date('2024-11-15'),
      saleEndDate: new Date('2024-12-01'),
      saleStatus: 'before_sale',
      createdAt: new Date(),
      updatedAt: new Date(),
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

    const { deps, calls } = createDeps({ collected: [mockTicket] });
    const result = await collectTickets(deps);

    assertEquals(result.status, 'success');
    assertEquals(result.ticketsFound, 1);
    assertEquals(result.newTickets, 1);
    assertEquals(typeof result.executionDurationMs, 'number');

    assertEquals(calls.findByIds, [['test-ticket-1']]);
    assertEquals(calls.upsertMany.length, 1);
    assertEquals(calls.upsertMany[0].map((ticket) => ticket.id), ['test-ticket-1']);
    // 試合日が過去のチケットは通知スケジュールの対象外
    assertEquals(calls.scheduleNotifications.length, 0);
  });

  await t.step(
    'should preserve notificationScheduled state when updating existing tickets',
    async () => {
      // 既存チケット（通知スケジュール済み）
      const existingTicket = Ticket.fromExisting({
        id: 'test-ticket-preserve-notification',
        matchName: 'Test Match',
        matchDate: new Date('2024-12-01'),
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        competition: 'J1 League',
        venue: 'Test Stadium',
        ticketTypes: ['General'],
        ticketUrl: 'https://test.example.com/tickets/1',
        saleStartDate: new Date('2024-11-15'),
        saleEndDate: new Date('2024-12-01'),
        saleStatus: 'before_sale',
        createdAt: new Date(),
        updatedAt: new Date(),
        scrapedAt: new Date(),
        notificationScheduled: true, // 既に通知スケジュール済み
      });

      // 新しくスクレイピングされたチケット（通知未スケジュール）
      const scrapedTicket = await Ticket.createNew({
        matchName: 'Test Match',
        matchDate: new Date('2024-12-01'),
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        competition: 'J1 League',
        venue: 'Test Stadium Updated', // venueが更新されている
        ticketTypes: ['General'],
        ticketUrl: 'https://test.example.com/tickets/1',
        saleStartDate: new Date('2024-11-15'),
        saleEndDate: new Date('2024-12-01'),
        saleStatus: 'before_sale',
        scrapedAt: new Date(),
        notificationScheduled: false, // スクレイピング時は未スケジュール
      });

      // 既存チケットが存在することを設定（findByIds は scrapedTicket.id に existingTicket を返す）
      const { deps, calls } = createDeps({
        collected: [scrapedTicket],
        existing: new Map([[scrapedTicket.id, existingTicket]]),
      });
      const result = await collectTickets(deps);

      // 実行成功確認
      assertEquals(result.status, 'success');
      assertEquals(result.updatedTickets, 1);

      // notificationScheduled状態が保持されていることを確認（mergeWithによる）
      assertEquals(calls.upsertMany.length, 1);
      const upsertedTickets = calls.upsertMany[0];
      assertEquals(upsertedTickets.length, 1);
      assertEquals(upsertedTickets[0]!.notificationScheduled, true);
      assertEquals(upsertedTickets[0]!.venue, 'Test Stadium Updated'); // ビジネスデータは更新されている
      assertEquals(upsertedTickets[0]!.id, existingTicket.id); // IDも保持されている
      assertEquals(calls.upsert.length, 0);
    },
  );

  await t.step(
    '新規の販売前チケットは通知をスケジュールし、notificationScheduled=true で保存し直す',
    async () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const ticket = await Ticket.createNew({
        matchName: 'Future Match',
        matchDate: new Date(now + 30 * day),
        homeTeam: null,
        awayTeam: null,
        competition: null,
        venue: null,
        ticketTypes: [],
        ticketUrl: null,
        saleStartDate: new Date(now + 10 * day),
        saleEndDate: null,
        saleStatus: 'before_sale',
        scrapedAt: new Date(),
        notificationScheduled: false,
      });

      const { deps, calls } = createDeps({ collected: [ticket] });
      const result = await collectTickets(deps);

      assertEquals(result.status, 'success');
      assertEquals(result.newTickets, 1);
      assertEquals(calls.scheduleNotifications.length, 1);
      assertEquals(calls.scheduleNotifications[0].ticket.id, ticket.id);
      assertEquals(
        calls.scheduleNotifications[0].times.map((timing) => timing.type).sort(),
        ['day_before', 'hour_before', 'minutes_before'],
      );
      // 新規チケットなので既存通知のキャンセルは行わない
      assertEquals(calls.findByTicketId.length, 0);
      assertEquals(calls.cancelNotifications.length, 0);
      // スケジュール後に notificationScheduled=true で個別 upsert する
      assertEquals(calls.upsert.length, 1);
      assertEquals(calls.upsert[0].id, ticket.id);
      assertEquals(calls.upsert[0].notificationScheduled, true);
    },
  );

  await t.step('upsertMany が失敗したら個別の upsert にフォールバックする', async () => {
    const ticket = Ticket.fromExisting({
      id: 'test-ticket-fallback',
      matchName: 'Test Match',
      matchDate: new Date('2024-12-01'),
      homeTeam: null,
      awayTeam: null,
      competition: null,
      venue: null,
      ticketTypes: [],
      ticketUrl: null,
      saleStartDate: null,
      saleEndDate: null,
      saleStatus: 'before_sale',
      createdAt: new Date(),
      updatedAt: new Date(),
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

    const { deps, calls } = createDeps({
      collected: [ticket],
      upsertManyError: new Error('bulk failed'),
    });
    const result = await collectTickets(deps);

    assertEquals(result.status, 'success');
    assertEquals(result.newTickets, 1);
    assertEquals(calls.upsertMany.length, 1);
    assertEquals(calls.upsert.map((t) => t.id), ['test-ticket-fallback']);
  });

  await t.step('should handle collection service errors gracefully', async () => {
    const { deps } = createDeps({ collected: new Error('Mock collection error') });

    // エラー時は例外が投げられることを検証
    await assertRejects(
      () => collectTickets(deps),
      Error,
      'Mock collection error',
    );
  });
});

Deno.test('collectTickets - エラーの包み直し', async (t) => {
  const ticket = Ticket.fromExisting({
    id: 'test-ticket-error',
    matchName: 'Test Match',
    matchDate: new Date('2024-12-01'),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    ticketTypes: [],
    ticketUrl: null,
    saleStartDate: null,
    saleEndDate: null,
    saleStatus: 'before_sale',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    notificationScheduled: false,
  });

  await t.step('DatabaseError は TICKET_COLLECTION_FAILED で包み直す', async () => {
    const dbError = new DatabaseError(
      'TicketRepository',
      'findByIds',
      'connection refused',
      ErrorCodes.DB_FETCH_ERROR,
    );
    const { deps } = createDeps({ collected: [ticket], existing: dbError });

    const error = await assertRejects(() => collectTickets(deps), AppError);

    assertEquals(error.code, 'TICKET_COLLECTION_FAILED');
    assertEquals(
      error.message,
      '[TicketCollectionUseCase] Database operation failed: [TicketRepository.findByIds] connection refused',
    );
    assertEquals(error.cause, dbError);
    assertEquals(Object.keys(error.context ?? {}).sort(), ['executionDurationMs', 'sessionId']);
  });

  await t.step('その他のエラーは USECASE_EXECUTION_FAILED で包み直す', async () => {
    const { deps } = createDeps({ collected: new Error('Mock collection error') });

    const error = await assertRejects(() => collectTickets(deps), AppError);

    assertEquals(error.code, 'USECASE_EXECUTION_FAILED');
    assertEquals(
      error.message,
      '[TicketCollectionUseCase] Ticket collection failed: Mock collection error',
    );
    assert(error.cause instanceof Error);
    assertEquals(error.cause?.message, 'Mock collection error');
    assertEquals(Object.keys(error.context ?? {}).sort(), ['executionDurationMs', 'sessionId']);
  });
});

Deno.test('collectTickets - 集計とエラーの握りつぶし', async (t) => {
  const day = 24 * 60 * 60 * 1000;
  const futureTicket = () =>
    Ticket.createNew({
      matchName: 'Future Match',
      matchDate: new Date(Date.now() + 30 * day),
      homeTeam: null,
      awayTeam: null,
      competition: null,
      venue: null,
      ticketTypes: [],
      ticketUrl: null,
      saleStartDate: new Date(Date.now() + 10 * day),
      saleEndDate: null,
      saleStatus: 'before_sale',
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

  await t.step('通知のスケジュールが失敗しても成功として結果を返す', async () => {
    const ticket = await futureTicket();
    const { deps, calls } = createDeps({ collected: [ticket] });
    deps.notificationSchedulerService.scheduleNotifications = () =>
      Promise.reject(new Error('Cloud Tasks down'));

    const result = await collectTickets(deps);

    assertEquals(result.status, 'success');
    assertEquals(result.newTickets, 1);
    // スケジュールに失敗したので notificationScheduled=true の保存はしない
    assertEquals(calls.upsert.length, 0);
  });

  await t.step('変更のない既存チケットは unchanged として数え、upsert しない', async () => {
    const ticket = await futureTicket();
    const { deps, calls } = createDeps({
      collected: [ticket],
      existing: new Map([[ticket.id, ticket]]),
    });

    const result = await collectTickets(deps);

    assertEquals(result.ticketsFound, 1);
    assertEquals(result.newTickets, 0);
    assertEquals(result.updatedTickets, 0);
    assertEquals(result.unchangedTickets, 1);
    assertEquals(result.failedTickets, 0);
    assertEquals(calls.upsertMany.length, 0);
    assertEquals(calls.scheduleNotifications.length, 0);
  });

  await t.step(
    '一括 upsert の後の個別 upsert が失敗したチケットは failed として数える',
    async () => {
      const ticket = await futureTicket();
      const { deps, calls } = createDeps({
        collected: [ticket],
        upsertManyError: new Error('bulk failed'),
      });
      deps.ticketRepository.upsert = (failed) => {
        calls.upsert.push(failed);
        return Promise.reject(new Error('single failed'));
      };

      const result = await collectTickets(deps);

      assertEquals(result.status, 'success');
      assertEquals(result.newTickets, 0);
      assertEquals(result.failedTickets, 1);
      // 失敗したチケットは通知のスケジュール対象にしない
      assertEquals(calls.scheduleNotifications.length, 0);
    },
  );
});
