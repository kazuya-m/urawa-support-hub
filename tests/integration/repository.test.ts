import { assertEquals, assertNotEquals } from 'std/assert/mod.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { Ticket } from '@/domain/entities/index.ts';
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

Deno.test('TicketRepository - delete', async () => {
  const testTicket = await createTestTicketForIntegration('delete');

  await ticketRepo.upsert(testTicket);
  await cleanupTestDataById(supabase, 'tickets', testTicket.id);

  const result = await ticketRepo.findById(testTicket.id);
  assertEquals(result, null);
});

async function claimTestNotification(ticketId: string) {
  const claimed = await notificationRepo.claim(
    {
      ticketId,
      notificationType: 'day_before',
      notificationTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    { type: 'text', text: 'テスト' },
  );
  if (!claimed) throw new Error('claim failed');
  return claimed;
}

Deno.test('NotificationRepository - findById', async () => {
  const testTicket = await createTestTicketForIntegration('notification-save');

  try {
    await ticketRepo.upsert(testTicket);
    const claimed = await claimTestNotification(testTicket.id);

    const result = await notificationRepo.findById(claimed.id);

    assertEquals(result?.id, claimed.id);
    assertEquals(result?.ticketId, testTicket.id);
    assertEquals(result?.status, 'sending');
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test('NotificationRepository - findByTicketId', async () => {
  const testTicket = await createTestTicketForIntegration('notification-findByTicket');

  try {
    await ticketRepo.upsert(testTicket);
    const claimed = await claimTestNotification(testTicket.id);

    const results = await notificationRepo.findByTicketId(testTicket.id);
    const found = results.find((notification) => notification.id === claimed.id);

    assertNotEquals(found, undefined);
    assertEquals(found?.ticketId, testTicket.id);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});
