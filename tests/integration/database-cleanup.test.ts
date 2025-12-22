/**
 * Integration tests for database automatic cleanup functionality
 * Tests cleanup of old tickets and sent notifications
 */

import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { createTestSupabaseClient } from '@/tests/utils/test-supabase.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

// Test utilities
function createTestTicket(matchDate: Date) {
  return {
    match_name: 'Test Match',
    match_date: matchDate.toISOString(),
    home_team: 'Urawa Reds',
    away_team: 'Test Opponent',
    sale_start_date: new Date('2025-01-01T12:00:00+09:00').toISOString(),
    venue: 'Test Stadium',
    ticket_url: 'https://example.com/ticket',
    ticket_types: ['General'],
  };
}

async function cleanupTestData(supabase: SupabaseClient) {
  await supabase.from('notifications').delete().like('ticket_id', 'test-cleanup-%');
  await supabase.from('tickets').delete().like('id', 'test-cleanup-%');
}

Deno.test('Database Cleanup - manual_cleanup_old_tickets function', async () => {
  const supabase = createTestSupabaseClient();

  try {
    // Create test tickets with different match dates
    const now = new Date();
    const oldMatchDate = new Date(now);
    oldMatchDate.setDate(oldMatchDate.getDate() - 35); // 35 days ago (should be deleted)

    const recentMatchDate = new Date(now);
    recentMatchDate.setDate(recentMatchDate.getDate() - 20); // 20 days ago (should be kept)

    const futureMatchDate = new Date(now);
    futureMatchDate.setDate(futureMatchDate.getDate() + 10); // 10 days future (should be kept)

    // Insert test tickets
    const { error: insertError } = await supabase.from('tickets').insert([
      { id: 'test-cleanup-old-1', ...createTestTicket(oldMatchDate) },
      { id: 'test-cleanup-old-2', ...createTestTicket(oldMatchDate) },
      { id: 'test-cleanup-recent-1', ...createTestTicket(recentMatchDate) },
      { id: 'test-cleanup-future-1', ...createTestTicket(futureMatchDate) },
    ]);

    if (insertError) throw insertError;

    // Execute manual cleanup with 30-day retention
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
      'manual_cleanup_old_tickets',
      { retention_days: 30 },
    );

    if (cleanupError) throw cleanupError;

    assertExists(cleanupResult, 'Cleanup function should return result');
    assertEquals(
      cleanupResult.length > 0,
      true,
      'Should return at least one result row',
    );

    // Verify old tickets are deleted
    const { data: oldTickets, error: queryOldError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', 'test-cleanup-old-1');

    if (queryOldError) throw queryOldError;
    assertEquals(oldTickets?.length, 0, 'Old ticket should be deleted');

    // Verify recent and future tickets are kept
    const { data: recentTickets, error: queryRecentError } = await supabase
      .from('tickets')
      .select('id')
      .in('id', ['test-cleanup-recent-1', 'test-cleanup-future-1']);

    if (queryRecentError) throw queryRecentError;
    assertEquals(
      recentTickets?.length,
      2,
      'Recent and future tickets should be kept',
    );
  } finally {
    await cleanupTestData(supabase);
  }
});

Deno.test('Database Cleanup - manual_cleanup_sent_notifications function', async () => {
  const supabase = createTestSupabaseClient();

  try {
    // Create a test ticket first
    const { error: ticketError } = await supabase.from('tickets').insert([
      { id: 'test-cleanup-ticket-notif', ...createTestTicket(new Date()) },
    ]);
    if (ticketError) throw ticketError;

    // Create test notifications with different sent_at dates
    const now = new Date();
    const oldSentDate = new Date(now);
    oldSentDate.setDate(oldSentDate.getDate() - 95); // 95 days ago (should be deleted)

    const recentSentDate = new Date(now);
    recentSentDate.setDate(recentSentDate.getDate() - 60); // 60 days ago (should be kept)

    // Insert test notifications
    const { error: insertError } = await supabase.from('notifications').insert([
      {
        ticket_id: 'test-cleanup-ticket-notif',
        notification_type: 'day_before',
        status: 'sent',
        notification_time: oldSentDate.toISOString(),
        sent_at: oldSentDate.toISOString(),
      },
      {
        ticket_id: 'test-cleanup-ticket-notif',
        notification_type: 'hour_before',
        status: 'sent',
        notification_time: recentSentDate.toISOString(),
        sent_at: recentSentDate.toISOString(),
      },
      {
        ticket_id: 'test-cleanup-ticket-notif',
        notification_type: 'minutes_before',
        status: 'scheduled',
        notification_time: new Date().toISOString(),
        sent_at: null,
      },
    ]);

    if (insertError) throw insertError;

    // Execute manual cleanup with 90-day retention
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc(
      'manual_cleanup_sent_notifications',
      { retention_days: 90 },
    );

    if (cleanupError) throw cleanupError;

    assertExists(cleanupResult, 'Cleanup function should return result');

    // Verify old sent notification is deleted
    const { data: allNotifications, error: queryError } = await supabase
      .from('notifications')
      .select('status, sent_at')
      .eq('ticket_id', 'test-cleanup-ticket-notif');

    if (queryError) throw queryError;

    // Should have 2 notifications remaining (recent sent + scheduled)
    assertEquals(
      allNotifications?.length,
      2,
      'Should have 2 notifications remaining',
    );

    // Verify scheduled notification is kept
    const scheduledNotif = allNotifications?.find((n: { status: string }) =>
      n.status === 'scheduled'
    );
    assertExists(scheduledNotif, 'Scheduled notification should be kept');

    // Verify recent sent notification is kept
    const recentSentNotif = allNotifications?.find((
      n: { status: string; sent_at: string | null },
    ) => n.status === 'sent' && n.sent_at !== null);
    assertExists(recentSentNotif, 'Recent sent notification should be kept');
  } finally {
    await cleanupTestData(supabase);
  }
});

Deno.test('Database Cleanup - retention period edge cases', async () => {
  const supabase = createTestSupabaseClient();

  try {
    // Test ticket at retention boundary
    const now = new Date();

    // 29 days ago - should be kept
    const twentyNineDaysAgo = new Date(now);
    twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

    // 31 days ago - should be deleted
    const thirtyOneDaysAgo = new Date(now);
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    const { error: insertError } = await supabase.from('tickets').insert([
      { id: 'test-cleanup-boundary-kept', ...createTestTicket(twentyNineDaysAgo) },
      { id: 'test-cleanup-boundary-deleted', ...createTestTicket(thirtyOneDaysAgo) },
    ]);

    if (insertError) throw insertError;

    // Execute cleanup
    await supabase.rpc('manual_cleanup_old_tickets', { retention_days: 30 });

    // Verify 29 days ago ticket is kept
    const { data: keptTickets, error: keptError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', 'test-cleanup-boundary-kept');

    if (keptError) throw keptError;
    assertEquals(keptTickets?.length, 1, 'Ticket at 29 days should be kept');

    // Verify 31 days ago ticket is deleted
    const { data: deletedTickets, error: deletedError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', 'test-cleanup-boundary-deleted');

    if (deletedError) throw deletedError;
    assertEquals(deletedTickets?.length, 0, 'Ticket at 31 days should be deleted');
  } finally {
    await cleanupTestData(supabase);
  }
});
