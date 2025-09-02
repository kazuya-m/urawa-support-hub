/**
 * チケットデータの品質レベルを表す列挙型
 *
 * データの完全性に応じて3段階のレベルを定義。
 * 不完全なデータでも通知を送れるようにすることで、
 * ユーザーが販売を逃さないようにする。
 */
export enum DataQuality {
  /**
   * 最小限のデータ
   * - 通知は可能だが、詳細情報が不足
   * - 必須: matchName, matchDate, saleStartDate
   */
  MINIMAL = 'minimal',

  /**
   * 部分的なデータ
   * - 基本的な情報はあるが、一部欠損
   * - venue または ticketTypes のいずれかが存在
   */
  PARTIAL = 'partial',

  /**
   * 完全なデータ
   * - すべての重要情報が揃っている
   * - ticketUrl, venue, ticketTypes すべて存在
   */
  COMPLETE = 'complete',
}

/**
 * データ品質レベルの判定に必要な情報
 */
export interface DataQualityInfo {
  hasTicketUrl: boolean;
  hasVenue: boolean;
  hasTicketTypes: boolean;
}

/**
 * データ品質レベルを判定するユーティリティ関数
 */
export function determineDataQuality(info: DataQualityInfo): DataQuality {
  if (info.hasTicketUrl && info.hasVenue && info.hasTicketTypes) {
    return DataQuality.COMPLETE;
  }
  if (info.hasVenue || info.hasTicketTypes) {
    return DataQuality.PARTIAL;
  }
  return DataQuality.MINIMAL;
}
