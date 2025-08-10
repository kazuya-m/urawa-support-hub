import { assertEquals, assertNotEquals } from "std/assert/mod.ts";
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { NotificationRepositoryImpl } from '@/infrastructure/repositories/NotificationRepositoryImpl.ts';
import { Ticket, NotificationHistory } from '@/domain/entities/index.ts';
import { createTestSupabaseClient, cleanupTestData } from '@/tests/utils/test-supabase.ts';

const supabase = createTestSupabaseClient();
const ticketRepo = new TicketRepositoryImpl(supabase);
const notificationRepo = new NotificationRepositoryImpl(supabase);

function createTestTicket(): Ticket {
  const now = new Date();
  const futureMatchDate = new Date(now);
  futureMatchDate.setMonth(futureMatchDate.getMonth() + 2);
  
  const futureSaleDate = new Date(now);
  futureSaleDate.setMonth(futureSaleDate.getMonth() + 1);
  
  return new Ticket({
    id: crypto.randomUUID(),
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: futureSaleDate,
    saleStartTime: '10:00',
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席', '一般販売'],
    ticketUrl: 'https://example.com/tickets/test',
    createdAt: now,
    updatedAt: now
  });
}

async function cleanupTicket(ticketId: string) {
  await cleanupTestData(supabase, 'tickets', ticketId);
}

async function cleanupNotification(notificationId: string) {
  await cleanupTestData(supabase, 'notification_history', notificationId);
}

Deno.test("TicketRepository - save and findById", async () => {
  const testTicket = createTestTicket();
  
  try {
    await ticketRepo.save(testTicket);
    const result = await ticketRepo.findById(testTicket.id);
    
    assertEquals(result?.id, testTicket.id);
    assertEquals(result?.matchName, testTicket.matchName);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test("TicketRepository - update", async () => {
  const testTicket = createTestTicket();
  
  try {
    await ticketRepo.save(testTicket);
    
    const updatedTicket = new Ticket({
      ...testTicket.toPlainObject(),
      matchName: '更新済み試合名'
    });
    await ticketRepo.update(updatedTicket);
    
    const result = await ticketRepo.findById(testTicket.id);
    assertEquals(result?.matchName, '更新済み試合名');
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test("TicketRepository - findAll", async () => {
  const testTicket = createTestTicket();
  
  try {
    await ticketRepo.save(testTicket);
    
    const results = await ticketRepo.findAll();
    const found = results.find(t => t.id === testTicket.id);
    
    assertNotEquals(found, undefined);
    assertEquals(found?.matchName, testTicket.matchName);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test("TicketRepository - findByDateRange", async () => {
  const testTicket = createTestTicket();
  
  try {
    await ticketRepo.save(testTicket);
    
    const currentTime = new Date();
    const results = await ticketRepo.findByDateRange('match_date', currentTime);
    const found = results.find(t => t.id === testTicket.id);
    
    assertNotEquals(found, undefined);
  } finally {
    await cleanupTicket(testTicket.id);
  }
});

Deno.test("TicketRepository - delete", async () => {
  const testTicket = createTestTicket();
  
  await ticketRepo.save(testTicket);
  await ticketRepo.delete(testTicket.id);
  
  const result = await ticketRepo.findById(testTicket.id);
  assertEquals(result, null);
});

Deno.test("NotificationRepository - save and findById", async () => {
  const testTicket = createTestTicket();
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date()
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

Deno.test("NotificationRepository - findByTicketId", async () => {
  const testTicket = createTestTicket();
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date()
  });
  
  try {
    await ticketRepo.save(testTicket);
    await notificationRepo.save(testNotification);
    
    const results = await notificationRepo.findByTicketId(testTicket.id);
    const found = results.find(n => n.id === testNotification.id);
    
    assertNotEquals(found, undefined);
    assertEquals(found?.ticketId, testTicket.id);
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test("NotificationRepository - findByColumn", async () => {
  const testTicket = createTestTicket();
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date()
  });
  
  try {
    await ticketRepo.save(testTicket);
    await notificationRepo.save(testNotification);
    
    const results = await notificationRepo.findByColumn('status', 'pending');
    const found = results.find(n => n.id === testNotification.id);
    
    assertNotEquals(found, undefined);
    assertEquals(found?.status, 'pending');
  } finally {
    await cleanupNotification(testNotification.id);
    await cleanupTicket(testTicket.id);
  }
});

Deno.test("NotificationRepository - update", async () => {
  const testTicket = createTestTicket();
  const testNotification = new NotificationHistory({
    id: crypto.randomUUID(),
    ticketId: testTicket.id,
    notificationType: 'day_before' as const,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'pending' as const,
    createdAt: new Date()
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