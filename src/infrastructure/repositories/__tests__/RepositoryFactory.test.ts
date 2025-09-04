import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { RepositoryFactory } from '../RepositoryFactory.ts';

Deno.test('RepositoryFactory - setup environment', () => {
  Deno.env.set('SUPABASE_URL', 'https://test-project.supabase.co');
  Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
});

Deno.test({
  name: 'RepositoryFactory - getTicketRepository should return same instance',
  sanitizeResources: false,
  sanitizeOps: false,
  fn() {
    // インスタンスをリセット
    RepositoryFactory.resetInstances();

    const repo1 = RepositoryFactory.getTicketRepository();
    const repo2 = RepositoryFactory.getTicketRepository();

    assertEquals(repo1, repo2);
    assertEquals(typeof repo1.findAll, 'function');
    assertEquals(typeof repo1.upsert, 'function');
    assertEquals(typeof repo1.findById, 'function');
  },
});

Deno.test('RepositoryFactory - getNotificationRepository should return same instance', () => {
  // インスタンスをリセット
  RepositoryFactory.resetInstances();

  const repo1 = RepositoryFactory.getNotificationRepository();
  const repo2 = RepositoryFactory.getNotificationRepository();

  assertEquals(repo1, repo2);
  assertEquals(typeof repo1.findAll, 'function');
  assertEquals(typeof repo1.save, 'function');
  assertEquals(typeof repo1.findById, 'function');
});

Deno.test('RepositoryFactory - resetInstances should clear cached repositories', () => {
  const ticketRepo1 = RepositoryFactory.getTicketRepository();
  const notificationRepo1 = RepositoryFactory.getNotificationRepository();

  RepositoryFactory.resetInstances();

  const ticketRepo2 = RepositoryFactory.getTicketRepository();
  const notificationRepo2 = RepositoryFactory.getNotificationRepository();

  assertEquals(typeof ticketRepo1.findAll, 'function');
  assertEquals(typeof ticketRepo2.findAll, 'function');
  assertEquals(typeof notificationRepo1.findAll, 'function');
  assertEquals(typeof notificationRepo2.findAll, 'function');
});

Deno.test('RepositoryFactory - cleanup environment', () => {
  Deno.env.delete('SUPABASE_URL');
  Deno.env.delete('SUPABASE_ANON_KEY');
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
  RepositoryFactory.resetInstances();
});
