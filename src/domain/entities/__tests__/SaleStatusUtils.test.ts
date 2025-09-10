import { assertEquals } from 'std/assert/mod.ts';
import { determineSaleStatus, parseSaleDate } from '../SaleStatusUtils.ts';

Deno.test('determineSaleStatus should return correct status based on dates', () => {
  const baseTime = new Date('2024-08-15T12:00:00Z');

  const saleStartDate = new Date('2024-08-16T10:00:00Z');
  const saleEndDate = new Date('2024-09-12T23:59:00Z');

  assertEquals(
    determineSaleStatus(saleStartDate, undefined, baseTime),
    'before_sale',
    'Should be before_sale when current time is before sale start',
  );

  const duringTime = new Date('2024-08-20T12:00:00Z');
  assertEquals(
    determineSaleStatus(saleStartDate, saleEndDate, duringTime),
    'on_sale',
    'Should be on_sale when current time is between start and end',
  );

  const afterTime = new Date('2024-09-13T12:00:00Z');
  assertEquals(
    determineSaleStatus(saleStartDate, saleEndDate, afterTime),
    'ended',
    'Should be ended when current time is after sale end',
  );

  const noStartTime = new Date('2024-08-10T12:00:00Z');
  assertEquals(
    determineSaleStatus(undefined, saleEndDate, noStartTime),
    'on_sale',
    'Should default to on_sale when no start date is provided',
  );
});

Deno.test('parseSaleDate should parse before_sale format correctly', () => {
  const beforeSaleText = '08/15(金)10:00〜';
  const result = parseSaleDate(beforeSaleText);

  assertEquals(result.saleStatus, 'before_sale');
  assertEquals(result.saleStartDate?.getMonth(), 7); // August (0-indexed)
  assertEquals(result.saleStartDate?.getDate(), 15);
  assertEquals(result.saleStartDate?.getHours(), 10);
  assertEquals(result.saleStartDate?.getMinutes(), 0);
  assertEquals(result.saleEndDate, undefined);
});

Deno.test('parseSaleDate should parse on_sale format correctly', () => {
  const onSaleText = '〜09/12(金)23:59';
  const result = parseSaleDate(onSaleText);

  assertEquals(result.saleStatus, 'on_sale');
  assertEquals(result.saleStartDate, undefined);
  assertEquals(result.saleEndDate?.getMonth(), 8); // September (0-indexed)
  assertEquals(result.saleEndDate?.getDate(), 12);
  assertEquals(result.saleEndDate?.getHours(), 23);
  assertEquals(result.saleEndDate?.getMinutes(), 59);
});

Deno.test('parseSaleDate should parse full range format correctly', () => {
  const fullRangeText = '08/15(金)10:00〜09/12(金)23:59';
  const result = parseSaleDate(fullRangeText);

  assertEquals(result.saleStartDate?.getMonth(), 7); // August
  assertEquals(result.saleStartDate?.getDate(), 15);
  assertEquals(result.saleEndDate?.getMonth(), 8); // September
  assertEquals(result.saleEndDate?.getDate(), 12);

  assertEquals(typeof result.saleStatus, 'string');
  assertEquals(['before_sale', 'on_sale', 'ended'].includes(result.saleStatus!), true);
});

Deno.test('parseSaleDate should throw error for unknown format', () => {
  let errorThrown = false;
  try {
    parseSaleDate('Unknown format');
  } catch (error) {
    errorThrown = true;
    assertEquals(error instanceof Error, true);
    if (error instanceof Error) {
      assertEquals(error.message.includes('Unknown sale date format'), true);
    }
  }
  assertEquals(errorThrown, true, 'Should throw error for unknown format');
});
