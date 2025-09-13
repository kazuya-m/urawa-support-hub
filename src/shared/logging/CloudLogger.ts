/**
 * Cloud Logger
 * GCP Cloud Loggingに対応した構造化ログ出力クラス
 */

import type { CloudLoggingEntry, LogSeverity } from './types.ts';

export class CloudLogger {
  /**
   * Cloud Loggingエントリをフォーマット
   */
  private static formatEntry(
    severity: LogSeverity,
    message: string,
    payload?: CloudLoggingEntry['jsonPayload'],
  ): CloudLoggingEntry {
    const entry: CloudLoggingEntry = {
      severity,
      message,
    };

    if (payload) {
      entry.jsonPayload = payload;
    }

    // Cloud Runで自動的に設定される環境変数を利用
    if (Deno.env.get('K_SERVICE')) {
      entry['logging.googleapis.com/labels'] = {
        service: Deno.env.get('K_SERVICE') || '',
        revision: Deno.env.get('K_REVISION') || '',
      };
    }

    return entry;
  }

  /**
   * ログ出力すべきかどうかを判定
   */
  private static shouldLog(severity: LogSeverity): boolean {
    const env = Deno.env.get('NODE_ENV') || 'production';
    // 本番環境のみDEBUGログを抑制
    if (env === 'production' && severity === 'DEBUG') {
      return false;
    }
    return true;
  }

  /**
   * ログを出力
   */
  private static log(
    severity: LogSeverity,
    message: string,
    payload?: CloudLoggingEntry['jsonPayload'],
  ): void {
    if (!this.shouldLog(severity)) return;

    const entry = this.formatEntry(severity, message, payload);

    // Cloud Runで自動的に収集される
    console.log(JSON.stringify(entry));
  }

  /**
   * DEBUGレベルログ（開発環境のみ）
   */
  static debug(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('DEBUG', message, payload);
  }

  /**
   * INFOレベルログ（正常な処理完了）
   */
  static info(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('INFO', message, payload);
  }

  /**
   * WARNINGレベルログ（警告、処理は継続）
   */
  static warning(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('WARNING', message, payload);
  }

  /**
   * ERRORレベルログ（エラー、個別処理失敗）
   */
  static error(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('ERROR', message, payload);
  }

  /**
   * CRITICALレベルログ（重大エラー、システム全体影響）
   */
  static critical(message: string, payload?: CloudLoggingEntry['jsonPayload']): void {
    this.log('CRITICAL', message, payload);
  }
}
