/**
 * 大会名の正規化
 * サイトごとに表記が異なる大会名を、共通の名前にそろえる
 */

/** 正規化後の大会名 */
export const COMPETITION_NAMES = {
  J1: 'J1リーグ',
  LEVAIN_CUP: 'ルヴァンカップ',
  EMPERORS_CUP: '天皇杯',
  ACLE: 'ACLE',
  ACL2: 'ACL2',
} as const;

/**
 * 完全一致で使う表記の対応表（J リーグチケットサイトの表記）
 */
const COMPETITION_EXACT_NAMES: Readonly<Record<string, string>> = {
  '明治安田Ｊ１リーグ': COMPETITION_NAMES.J1,
  '明治安田J1リーグ': COMPETITION_NAMES.J1,
  'ＹＢＣルヴァンカップ': COMPETITION_NAMES.LEVAIN_CUP,
  'JリーグYBCルヴァンカップ': COMPETITION_NAMES.LEVAIN_CUP,
  'ルヴァンカップ': COMPETITION_NAMES.LEVAIN_CUP,
  '天皇杯': COMPETITION_NAMES.EMPERORS_CUP,
  'ＡＦＣチャンピオンズリーグエリート': COMPETITION_NAMES.ACLE,
  'AFCチャンピオンズリーグエリート': COMPETITION_NAMES.ACLE,
  'ＡＦＣチャンピオンズリーグ２': COMPETITION_NAMES.ACL2,
  'AFCチャンピオンズリーグ2': COMPETITION_NAMES.ACL2,
  'AFCチャンピオンズリーグ２': COMPETITION_NAMES.ACL2,
  'ACLE': COMPETITION_NAMES.ACLE,
  'ACL2': COMPETITION_NAMES.ACL2,
};

/**
 * 部分一致で使う規則（サンフレッチェ広島サイトの表記）
 * 先頭から順に照合し、最初に含まれたキーワードの大会名を返す
 */
const COMPETITION_KEYWORD_RULES: ReadonlyArray<readonly [string, string]> = [
  ['J1', COMPETITION_NAMES.J1],
  ['ルヴァン', COMPETITION_NAMES.LEVAIN_CUP],
  ['天皇杯', COMPETITION_NAMES.EMPERORS_CUP],
  // 'ACL2' も 'ACL' を含むため ACLE になる
  ['ACL', COMPETITION_NAMES.ACLE],
];

/**
 * 対応表と完全一致する表記を正規化する。一致しなければそのまま返す
 */
export function normalizeCompetitionExact(name: string): string {
  return COMPETITION_EXACT_NAMES[name] || name;
}

/**
 * キーワードを含む表記を正規化する。どれも含まなければそのまま返す
 */
export function normalizeCompetitionByKeyword(name: string): string {
  for (const [keyword, normalized] of COMPETITION_KEYWORD_RULES) {
    if (name.includes(keyword)) {
      return normalized;
    }
  }
  return name;
}
