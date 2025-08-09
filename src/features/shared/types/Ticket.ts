export interface Ticket {
  id: string;
  matchName: string;
  matchDate: Date;
  homeTeam: string;
  awayTeam: string;
  saleStartDate: Date;
  saleStartTime?: string;
  venue: string;
  ticketTypes: string[];
  ticketUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapedTicketData {
  matchName: string;
  matchDate: string;
  saleDate: string;
  ticketTypes: string[];
  ticketUrl: string;
  venue: string;
}