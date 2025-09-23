import { assertEquals, assertNotEquals } from 'std/assert/mod.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { Notification, Ticket } from '@/domain/entities/index.ts';
import {
  cleanupTestData,
  cleanupTestDataById,
  createTestSupabaseClient,
} from '@/tests/utils/test-supabase.ts';
import { createDynamicTestTicket } from '@/tests/utils/test-fixtures.ts';
import { getErrorMessage } from '@/shared/utils/errorUtils.ts';

const supabase = createTestSupabaseClient();
const ticketRepo = new TicketRepository(supabase);
const notificationRepo = new NotificationRepository(supabase);

// 各テストで一意なIDを持つテストチケットを生成する関数
// test-fixtures.ts の createDynamicTestTicket を使用
function createTestTicketForIntegration(suffix = ''): Promise<Ticket> {
  return createDynamicTestTicket({ suffix });
}

async function cleanupTicket(ticketId: string) {
  try {
    // cleanupTestDataById を使用するか、条件文字列形式で呼び出し
    await cleanupTestData(supabase, 'tickets', `id = '${ticketId}'`);
  } catch (error) {
    // テストクリーンアップでのエラーは無視（ログ出力なし）
    // console.warn を削除: ` Failed to cleanup ticket ${ticketId}: ${getErrorMessage(error)}`;
  }
}

async function cleanupNotification(notificationId: string) {
  try {
    await cleanupTestData(supabase, 'notifications', `id = '${notificationId}'`);
  } catch (error) {
    // テストクリーンアップでのエラーは無視（ログ出力なし）
    // console.warn を削除: ` Failed to cleanup notification ${notificationId}: ${getErrorMessage(error)}`;
  }
}

Deno.test('TicketRepository - save and findById', async () => {
  const testTicket = await createTestTicketForIntegration('save-findById');

  try {
    await ticketRepo.upsert(testTicket);
    const result = await ticketRepo.findById(testTicket.id);

    assertEquals(result?.id, testTicket.id);
    assertEquals(result?.matchName, testTicket.matchName);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - update', async () => {
  const testTicket = await createTestTicketForIntegration('update');

  try {
    await ticketRepo.upsert(testTicket);

    const updatedTicket = Ticket.fromExisting({
      ...testTicket.toPlainObject(),
      matchName: '更新済み試合名',
    });
    await ticketRepo.upsert(updatedTicket);

    const result = await ticketRepo.findById(testTicket.id);
    assertEquals(result?.matchName, '更新済み試合名');
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - findAll', async () => {
  const testTicket = await createTestTicketForIntegration('findAll');

  try {
    await ticketRepo.upsert(testTicket);

    const results = await ticketRepo.findAll();
    const found = results.find((ticket) => ticket.id === testTicket.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.matchName, testTicket.matchName);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - findByDateRange', async () => {
  const testTicket = await createTestTicketForIntegration('findByDateRange');

  try {
    await ticketRepo.upsert(testTicket);

    const currentTime = new Date();
    const results = await ticketRepo.findByDateRange('match_date', currentTime);
    const found = results.find((ticket) => ticket.id === testTicket.id);

    assertNotEquals(found, undefined);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - delete', async () => {
  const testTicket = await createTestTicketForIntegration('delete');

  await ticketRepo.upsert(testTicket);
  await cleanupTestDataById(supabase, 'tickets', testTicket.id);

  const result = await ticketRepo.findById(testTicket.id);
  assertEquals(result, null);
});

Deno.test('NotificationRepository - save and findById', async () => {
  const testTicket = await createTestTicketForIntegration('notification-save');
  const testNotification = new Notification({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'scheduled' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.upsert(testTicket);
    await notificationRepo.save(testNotification);

    const result = await notificationRepo.findById(testNotification.id);

    assertEquals(result?.id, testNotification.id);
    assertEquals(result?.ticketId, testNotification.ticketId);
    assertEquals(result?.status, 'scheduled');
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - findByTicketId', async () => {
  const testTicket = await createTestTicketForIntegration('notification-findByTicket');
  const testNotification = new Notification({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'scheduled' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.upsert(testTicket);
    await notificationRepo.save(testNotification);

    const results = await notificationRepo.findByTicketId(testTicket.id);
    const found = results.find((notification) => notification.id === testNotification.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.ticketId, testTicket.id);
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - findByColumn', async () => {
  const testTicket = await createTestTicketForIntegration('notification-findByColumn');
  const testNotification = new Notification({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'scheduled' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.upsert(testTicket);
    await notificationRepo.save(testNotification);

    const results = await notificationRepo.findByColumn('status', 'scheduled');
    const found = results.find((notification) => notification.id === testNotification.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.status, 'scheduled');
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - update', async () => {
  const testTicket = await createTestTicketForIntegration('notification-update');
  const testNotification = new Notification({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'scheduled' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.upsert(testTicket);
    await notificationRepo.save(testNotification);

    const notification = await notificationRepo.findById(testNotification.id);
    if (notification) {
      const sentNotification = notification.markAsSent();
      await notificationRepo.update(sentNotification);

      const updated = await notificationRepo.findById(testNotification.id);
      assertEquals(updated?.status, 'sent');
      assertNotEquals(updated?.sentAt, null);
    }
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});
