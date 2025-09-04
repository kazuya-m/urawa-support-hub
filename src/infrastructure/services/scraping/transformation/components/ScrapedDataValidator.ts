import { ValidationResult } from '../../types/ValidationResult.ts';
import type { ParsedDateInfo, ParsedTicketData } from './TicketDataParser.ts';

export class ScrapedDataValidator {
  /**
   * パースされたチケットデータの全検証を一度に実行する統合メソッド
   */
  static validate(parsedData: ParsedTicketData): boolean {
    // 1. 基本フィールドの検証
    if (!parsedData.matchName || parsedData.matchName.trim() === '') {
      return false;
    }

    // 2. 日付の検証
    if (!parsedData.matchDate || isNaN(parsedData.matchDate.getTime())) {
      return false;
    }

    if (!parsedData.saleStartDate || isNaN(parsedData.saleStartDate.getTime())) {
      return false;
    }

    // 3. パース結果の日付検証
    if (!this.validateParsedDates(parsedData.parsedDates)) {
      return false;
    }

    return true;
  }

  static getOptionalErrors(validationResult: ValidationResult): Array<[string, string]> {
    return Object.entries(validationResult.errors)
      .filter(([_, error]) => error.includes('OPTIONAL'));
  }

  static validateDateFormats(matchDateStr: string, saleDateStr: string): {
    matchDate: Date | null;
    saleStartDate: Date | null;
    isValid: boolean;
  } {
    const matchDate = new Date(matchDateStr);
    const saleStartDate = new Date(saleDateStr);

    const matchDateValid = !isNaN(matchDate.getTime());
    const saleDateValid = !isNaN(saleStartDate.getTime());

    return {
      matchDate: matchDateValid ? matchDate : null,
      saleStartDate: saleDateValid ? saleStartDate : null,
      isValid: matchDateValid && saleDateValid,
    };
  }

  /**
   * パースされた日付情報が有効かどうかを検証する
   * saleStartDateまたはsaleEndDateのいずれかが存在する必要がある
   */
  static validateParsedDates(parsedDates: ParsedDateInfo): boolean {
    return !!(parsedDates.saleStartDate || parsedDates.saleEndDate);
  }
}
