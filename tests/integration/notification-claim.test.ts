import { assertEquals, assertNotEquals } from 'std/assert/mod.ts';
import { createClient } from '@supabase/supabase-js';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import {
  type NotificationKey,
  NotificationRepository,
} from '@/infrastructure/repositories/NotificationRepository.ts';
import { Notification } from '@/domain/entities/index.ts';
import type { LineMessage } from '@/infrastructure/clients/LineClient.ts';
import { cleanupTestDataById, createTestSupabaseClient } from '@/tests/utils/test-supabase.ts';
import { createDynamicTestTicket } from '@/tests/utils/test-fixtures.ts';

const supabase = createTestSupabaseClient();
const ticketRepo = new TicketRepository(supabase);
const notificationRepo = new NotificationRepository(supabase);

const firstMessage: LineMessage = { type: 'text', text: '初回の本文' };
const secondMessage: LineMessage = { type: 'text', text: '2 回目の本文' };

async function withTicket(suffix: string, fn: (key: NotificationKey) => Promise<void>) {
  const ticket = await createDynamicTestTicket({ suffix });
  await ticketRepo.upsert(ticket);
  try {
    await fn({
      ticketId: ticket.id,
      notificationType: 'hour_before',
      notificationTime: new Date(Date.now() + 60 * 60 * 1000),
    });
  } finally {
    await cleanupTestDataById(supabase, 'tickets', ticket.id);
  }
}

async function findRow(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('status, claimed_at, message, sent_at, error_message')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function setRow(id: string, values: Record<string, unknown>) {
  const { error } = await supabase.from('notifications').update(values).eq('id', id);
  if (error) throw new Error(error.message);
}

function scheduledNotification(key: NotificationKey): Notification {
  return new Notification({
    id: crypto.randomUUID(),
    ticketId: key.ticketId,
    notificationType: key.notificationType,
    scheduledAt: key.notificationTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: new Date(),
    updatedAt: null,
  });
}

Deno.test('notifications の一意制約: 同じキーの 2 行目は INSERT できない', async () => {
  await withTicket('claim-unique', async (key) => {
    const row = {
      ticket_id: key.ticketId,
      notification_type: key.notificationType,
      notification_time: key.notificationTime.toISOString(),
      status: 'scheduled',
    };
    const first = await supabase.from('notifications').insert(row);
    const second = await supabase.from('notifications').insert(row);

    assertEquals(first.error, null);
    assertEquals(second.error?.code, '23505');
  });
});

Deno.test('NotificationRepository.save: 同じキーの行があれば何もしない', async () => {
  await withTicket('claim-save', async (key) => {
    const first = scheduledNotification(key);
    await notificationRepo.save(first);
    await notificationRepo.save(scheduledNotification(key));

    const rows = await notificationRepo.findByTicketId(key.ticketId);
    assertEquals(rows.map((row) => row.id), [first.id]);
  });
});

Deno.test('claim_notification: 初回は確保し、本文を保存する', async () => {
  await withTicket('claim-first', async (key) => {
    const claimed = await notificationRepo.claim(key, firstMessage);

    assertNotEquals(claimed, null);
    assertEquals(claimed?.message, firstMessage);
    const row = await findRow(claimed!.id);
    assertEquals(row.status, 'sending');
    assertNotEquals(row.claimed_at, null);
    assertEquals(row.message, firstMessage);
  });
});

Deno.test('claim_notification: 確保中の行は二重に確保できない', async () => {
  await withTicket('claim-double', async (key) => {
    await notificationRepo.claim(key, firstMessage);

    assertEquals(await notificationRepo.claim(key, secondMessage), null);
    assertEquals(await notificationRepo.findStatusByKey(key), 'sending');
  });
});

Deno.test('claim_notification: 同時に確保しても 1 件だけ確保できる', async () => {
  await withTicket('claim-concurrent', async (key) => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => notificationRepo.claim(key, firstMessage)),
    );

    assertEquals(results.filter((result) => result !== null).length, 1);
  });
});

Deno.test('claim_notification: 期限切れの sending は再確保でき、本文は初回のまま', async () => {
  await withTicket('claim-stale', async (key) => {
    const first = await notificationRepo.claim(key, firstMessage);
    await setRow(first!.id, { claimed_at: new Date(Date.now() - 7 * 60 * 1000).toISOString() });

    const second = await notificationRepo.claim(key, secondMessage);

    assertEquals(second?.id, first!.id);
    assertEquals(second?.message, firstMessage);
  });
});

Deno.test('claim_notification: failed は再確保できる', async () => {
  await withTicket('claim-failed', async (key) => {
    const first = await notificationRepo.claim(key, firstMessage);
    await notificationRepo.markFailed(first!.id, '500 down');
    assertEquals(await notificationRepo.findStatusByKey(key), 'failed');

    const second = await notificationRepo.claim(key, secondMessage);

    assertEquals(second?.id, first!.id);
    assertEquals(second?.message, firstMessage);
    const row = await findRow(first!.id);
    assertEquals(row.status, 'sending');
    assertEquals(row.error_message, null);
  });
});

Deno.test('claim_notification: 旧予約処理の scheduled・cancelled 行は再確保でき、本文を保存する', async () => {
  await withTicket('claim-scheduled', async (key) => {
    const scheduled = scheduledNotification(key);
    await notificationRepo.save(scheduled);
    await setRow(scheduled.id, { status: 'cancelled', error_message: 'Cancelled' });

    const claimed = await notificationRepo.claim(key, firstMessage);

    assertEquals(claimed?.id, scheduled.id);
    assertEquals(claimed?.message, firstMessage);
  });
});

Deno.test('claim_notification: sent は確保できない', async () => {
  await withTicket('claim-sent', async (key) => {
    const first = await notificationRepo.claim(key, firstMessage);
    await notificationRepo.markSent(first!.id, new Date());

    assertEquals(await notificationRepo.claim(key, secondMessage), null);
    assertEquals(await notificationRepo.findStatusByKey(key), 'sent');
  });
});

Deno.test('markSent・markFailed は sending 以外を上書きしない', async () => {
  await withTicket('claim-guard', async (key) => {
    const claimed = await notificationRepo.claim(key, firstMessage);
    await notificationRepo.markSent(claimed!.id, new Date());

    await notificationRepo.markFailed(claimed!.id, 'late failure');

    const row = await findRow(claimed!.id);
    assertEquals(row.status, 'sent');
    assertEquals(row.error_message, null);
    assertNotEquals(row.sent_at, null);
  });
});

Deno.test('markSent・markFailed は対象の行がなくてもエラーにしない', async () => {
  const missingId = crypto.randomUUID();
  await notificationRepo.markSent(missingId, new Date());
  await notificationRepo.markFailed(missingId, 'no row');
});

Deno.test('claim_notification: anon キーからは呼べない', async () => {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  const anon = createClient(Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321', anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await withTicket('claim-anon', async (key) => {
    const { error } = await anon.rpc('claim_notification', {
      p_ticket_id: key.ticketId,
      p_notification_type: key.notificationType,
      p_notification_time: key.notificationTime.toISOString(),
      p_message: firstMessage,
    });

    assertNotEquals(error, null);
    assertEquals(await notificationRepo.findStatusByKey(key), null);
  });
});

Deno.test('findStatusByKey: 行がなければ null', async () => {
  await withTicket('claim-none', async (key) => {
    assertEquals(await notificationRepo.findStatusByKey(key), null);
  });
});
