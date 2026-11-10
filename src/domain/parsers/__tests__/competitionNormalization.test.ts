import { assertEquals } from 'std/assert/mod.ts';
import {
  normalizeCompetitionByKeyword,
  normalizeCompetitionExact,
} from '../competitionNormalization.ts';

Deno.test('normalizeCompetitionExact', async (t) => {
  const cases: Array<[string, string]> = [
    ['明治安田Ｊ１リーグ', 'J1リーグ'],
    ['JリーグYBCルヴァンカップ', 'ルヴァンカップ'],
    ['天皇杯', '天皇杯'],
    ['ＡＦＣチャンピオンズリーグエリート', 'ACLE'],
    ['AFCチャンピオンズリーグ２', 'ACL2'],
    ['J1', 'J1'],
    ['天皇杯 3回戦', '天皇杯 3回戦'],
  ];
  for (const [input, expected] of cases) {
    await t.step(`'${input}' → ${expected}`, () => {
      assertEquals(normalizeCompetitionExact(input), expected);
    });
  }
});

Deno.test('normalizeCompetitionByKeyword', async (t) => {
  const cases: Array<[string, string]> = [
    ['J1', 'J1リーグ'],
    ['明治安田J1リーグ', 'J1リーグ'],
    ['JリーグYBCルヴァンカップ 準決勝', 'ルヴァンカップ'],
    ['天皇杯 3回戦', '天皇杯'],
    ['ACLE', 'ACLE'],
    ['ACL2', 'ACLE'],
    ['プレシーズンマッチ', 'プレシーズンマッチ'],
  ];
  for (const [input, expected] of cases) {
    await t.step(`'${input}' → ${expected}`, () => {
      assertEquals(normalizeCompetitionByKeyword(input), expected);
    });
  }
});
