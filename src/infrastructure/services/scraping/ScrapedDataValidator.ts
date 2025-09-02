import { ScrapedTicketData } from './types/ScrapedTicketData.ts';
import { ValidationResult } from './types/ValidationResult.ts';

export class ScrapedDataValidator {
  static validate(data: ScrapedTicketData): ValidationResult {
    const errors: Record<string, string> = {};

    if (!data.matchName || data.matchName.trim() === '') {
      errors.matchName = 'MISSING_OR_EMPTY';
    }
    if (!data.matchDate || data.matchDate.trim() === '') {
      errors.matchDate = 'MISSING_OR_EMPTY';
    }

    if (!data.saleDate || data.saleDate.trim() === '') {
      errors.saleDate = 'MISSING_OR_EMPTY';
    }

    if (!data.venue || data.venue.trim() === '') {
      errors.venue = 'MISSING_OPTIONAL';
    }
    if (!data.ticketUrl || data.ticketUrl.trim() === '') {
      errors.ticketUrl = 'MISSING_OPTIONAL';
    }

    const criticalErrors = Object.entries(errors)
      .filter(([_, error]) => error === 'MISSING_OR_EMPTY');

    return {
      isValid: criticalErrors.length === 0,
      errors,
    };
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
}
