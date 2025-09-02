import { TeamInfo } from './types/ValidationResult.ts';

export class TicketDataExtractor {
  static extractTeamsFromMatchName(matchName: string): TeamInfo {
    if (!matchName) return {};

    const normalized = matchName.trim();

    const vsPattern = /^(.+?)\s*(?:[vｖ][sｓ]|VS|vs)\s*(.+?)$/i;
    const vsMatch = normalized.match(vsPattern);
    if (vsMatch) {
      return {
        homeTeam: vsMatch[1].trim(),
        awayTeam: vsMatch[2].trim(),
      };
    }

    const taiPattern = /^(.+?)\s*対\s*(.+?)$/;
    const taiMatch = normalized.match(taiPattern);
    if (taiMatch) {
      return {
        homeTeam: taiMatch[1].trim(),
        awayTeam: taiMatch[2].trim(),
      };
    }

    const dashPattern = /^(.+?)\s*[-−]\s*(.+?)$/;
    const dashMatch = normalized.match(dashPattern);
    if (dashMatch) {
      return {
        homeTeam: dashMatch[1].trim(),
        awayTeam: dashMatch[2].trim(),
      };
    }

    const crossPattern = /^(.+?)\s*[×x]\s*(.+?)$/i;
    const crossMatch = normalized.match(crossPattern);
    if (crossMatch) {
      return {
        homeTeam: crossMatch[1].trim(),
        awayTeam: crossMatch[2].trim(),
      };
    }

    return {};
  }
}
