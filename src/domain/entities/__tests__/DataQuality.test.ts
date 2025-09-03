import { assertEquals } from 'jsr:@std/assert';
import { DataQuality, determineDataQuality } from '../DataQuality.ts';

Deno.test('DataQuality - 完全なデータ', () => {
  const quality = determineDataQuality({
    hasTicketUrl: true,
    hasVenue: true,
    hasTicketTypes: true,
  });
  assertEquals(quality, DataQuality.COMPLETE);
});

Deno.test('DataQuality - 部分的なデータ（venue あり）', () => {
  const quality = determineDataQuality({
    hasTicketUrl: false,
    hasVenue: true,
    hasTicketTypes: false,
  });
  assertEquals(quality, DataQuality.PARTIAL);
});

Deno.test('DataQuality - 部分的なデータ（ticketTypes あり）', () => {
  const quality = determineDataQuality({
    hasTicketUrl: false,
    hasVenue: false,
    hasTicketTypes: true,
  });
  assertEquals(quality, DataQuality.PARTIAL);
});

Deno.test('DataQuality - 最小限のデータ', () => {
  const quality = determineDataQuality({
    hasTicketUrl: false,
    hasVenue: false,
    hasTicketTypes: false,
  });
  assertEquals(quality, DataQuality.MINIMAL);
});

Deno.test('DataQuality - URLのみでは部分的にならない', () => {
  const quality = determineDataQuality({
    hasTicketUrl: true,
    hasVenue: false,
    hasTicketTypes: false,
  });
  assertEquals(quality, DataQuality.MINIMAL);
});
