import { assertEquals } from 'jsr:@std/assert';
import { ScrapedDataValidator } from '../ScrapedDataValidator.ts';
import { ScrapedTicketData } from '../types/ScrapedTicketData.ts';

Deno.test('ScrapedDataValidator - 必須データがすべて存在する場合', () => {
  const data: ScrapedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024-05-15',
    saleDate: '2024-05-01',
    venue: 'さいたまスタジアム',
    ticketUrl: 'https://example.com',
    ticketTypes: ['一般', '指定席'],
    homeTeam: '浦和レッズ',
    awayTeam: 'FC東京',
  };

  const result = ScrapedDataValidator.validate(data);
  assertEquals(result.isValid, true);
  assertEquals(Object.keys(result.errors).length, 0);
});

Deno.test('ScrapedDataValidator - 必須データが不足している場合', () => {
  const data: ScrapedTicketData = {
    matchName: '',
    matchDate: '2024-05-15',
    saleDate: '',
    venue: '',
    ticketUrl: '',
    ticketTypes: [],
    homeTeam: null,
    awayTeam: null,
  };

  const result = ScrapedDataValidator.validate(data);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.matchName, 'MISSING_OR_EMPTY');
  assertEquals(result.errors.saleDate, 'MISSING_OR_EMPTY');
});

Deno.test('ScrapedDataValidator - オプショナルデータが不足している場合', () => {
  const data: ScrapedTicketData = {
    matchName: '浦和レッズ vs FC東京',
    matchDate: '2024-05-15',
    saleDate: '2024-05-01',
    venue: '',
    ticketUrl: '',
    ticketTypes: [],
    homeTeam: null,
    awayTeam: null,
  };

  const result = ScrapedDataValidator.validate(data);
  assertEquals(result.isValid, true);
  assertEquals(result.errors.venue, 'MISSING_OPTIONAL');
  assertEquals(result.errors.ticketUrl, 'MISSING_OPTIONAL');
});

Deno.test('ScrapedDataValidator - getOptionalErrors', () => {
  const validationResult = {
    isValid: true,
    errors: {
      venue: 'MISSING_OPTIONAL',
      ticketUrl: 'MISSING_OPTIONAL',
      matchName: 'MISSING_OR_EMPTY',
    },
  };

  const optionalErrors = ScrapedDataValidator.getOptionalErrors(validationResult);
  assertEquals(optionalErrors.length, 2);
  assertEquals(optionalErrors[0][0], 'venue');
  assertEquals(optionalErrors[1][0], 'ticketUrl');
});

Deno.test('ScrapedDataValidator - validateDateFormats: 正常な日付', () => {
  const result = ScrapedDataValidator.validateDateFormats('2024-05-15', '2024-05-01');

  assertEquals(result.isValid, true);
  assertEquals(result.matchDate?.getTime(), new Date('2024-05-15').getTime());
  assertEquals(result.saleStartDate?.getTime(), new Date('2024-05-01').getTime());
});

Deno.test('ScrapedDataValidator - validateDateFormats: 不正な日付', () => {
  const result = ScrapedDataValidator.validateDateFormats('invalid-date', '2024-05-01');

  assertEquals(result.isValid, false);
  assertEquals(result.matchDate, null);
  assertEquals(result.saleStartDate?.getTime(), new Date('2024-05-01').getTime());
});
