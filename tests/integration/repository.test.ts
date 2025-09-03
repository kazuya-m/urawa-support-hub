import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { NotificationRepositoryImpl } from '@/infrastructure/repositories/NotificationRepositoryImpl.ts';
import { NotificationHistory, Ticket } from '@/domain/entities/index.ts';
import { cleanupTestData, createTestSupabaseClient } from '@/tests/utils/test-supabase.ts';
import { createDynamicTestTicket } from '@/tests/utils/test-fixtures.ts';

const supabase = createTestSupabaseClient();
const ticketRepo = new TicketRepositoryImpl(supabase);
const notificationRepo = new NotificationRepositoryImpl(supabase);

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
    console.warn(`Failed to cleanup ticket ${ticketId}:`, error);
  }
}

async function cleanupNotification(notificationId: string) {
  try {
    await cleanupTestData(supabase, 'notification_history', `id = '${notificationId}'`);
  } catch (error) {
    console.warn(`Failed to cleanup notification ${notificationId}:`, error);
  }
}

Deno.test('TicketRepository - save and findById', async () => {
  const testTicket = await createTestTicketForIntegration('save-findById');

  try {
    await ticketRepo.save(testTicket);
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
    await ticketRepo.save(testTicket);

    const updatedTicket = Ticket.fromExisting({
      ...testTicket.toPlainObject(),
      matchName: '更新済み試合名',
    });
    await ticketRepo.update(updatedTicket);

    const result = await ticketRepo.findById(testTicket.id);
    assertEquals(result?.matchName, '更新済み試合名');
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - findAll', async () => {
  const testTicket = await createTestTicketForIntegration('findAll');

  try {
    await ticketRepo.save(testTicket);

    const results = await ticketRepo.findAll();
    const found = results.find((t) => t.id === testTicket.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.matchName, testTicket.matchName);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - findByDateRange', async () => {
  const testTicket = await createTestTicketForIntegration('findByDateRange');

  try {
    await ticketRepo.save(testTicket);

    const currentTime = new Date();
    const results = await ticketRepo.findByDateRange('match_date', currentTime);
    const found = results.find((t) => t.id === testTicket.id);

    assertNotEquals(found, undefined);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('TicketRepository - delete', async () => {
  const testTicket = await createTestTicketForIntegration('delete');

  await ticketRepo.save(testTicket);
  await ticketRepo.delete(testTicket.id);

  const result = await ticketRepo.findById(testTicket.id);
  assertEquals(result, null);
});

Deno.test('NotificationRepository - save and findById', async () => {
  const testTicket = await createTestTicketForIntegration('notification-save');
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.save(testTicket);
    await notificationRepo.save(testNotification);

    const result = await notificationRepo.findById(testNotification.id);

    assertEquals(result?.id, testNotification.id);
    assertEquals(result?.ticketId, testNotification.ticketId);
    assertEquals(result?.status, 'pending');
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - findByTicketId', async () => {
  const testTicket = await createTestTicketForIntegration('notification-findByTicket');
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.save(testTicket);
    await notificationRepo.save(testNotification);

    const results = await notificationRepo.findByTicketId(testTicket.id);
    const found = results.find((n) => n.id === testNotification.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.ticketId, testTicket.id);
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - findByColumn', async () => {
  const testTicket = await createTestTicketForIntegration('notification-findByColumn');
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.save(testTicket);
    await notificationRepo.save(testNotification);

    const results = await notificationRepo.findByColumn('status', 'pending');
    const found = results.find((n) => n.id === testNotification.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.status, 'pending');
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - update', async () => {
  const testTicket = await createTestTicketForIntegration('notification-update');
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date(),
  });

  try {
    await ticketRepo.save(testTicket);
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
