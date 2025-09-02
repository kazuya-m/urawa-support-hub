export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface TeamInfo {
  homeTeam?: string;
  awayTeam?: string;
}

export interface ValidatedTicketData {
  matchName: string;
  matchDate: string;
  saleDate: string;
  venue?: string;
  ticketUrl?: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  ticketTypes?: string[];
}
