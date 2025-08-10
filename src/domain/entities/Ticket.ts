import { NotificationType, shouldSendNotificationAtTime } from './NotificationConfig.ts';

interface TicketProps {
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

export class Ticket {
  private readonly props: TicketProps;

  constructor(props: TicketProps) {
    this.validateTicketData(props);
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get matchName(): string {
    return this.props.matchName;
  }
  get matchDate(): Date {
    return this.props.matchDate;
  }
  get homeTeam(): string {
    return this.props.homeTeam;
  }
  get awayTeam(): string {
    return this.props.awayTeam;
  }
  get saleStartDate(): Date {
    return this.props.saleStartDate;
  }
  get saleStartTime(): string | undefined {
    return this.props.saleStartTime;
  }
  get venue(): string {
    return this.props.venue;
  }
  get ticketTypes(): string[] {
    return [...this.props.ticketTypes];
  }
  get ticketUrl(): string {
    return this.props.ticketUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  shouldSendNotification(type: NotificationType, currentTime: Date = new Date()): boolean {
    return shouldSendNotificationAtTime(type, this.props.saleStartDate, currentTime);
  }

  isOnSale(currentTime: Date = new Date()): boolean {
    return currentTime >= this.props.saleStartDate && this.isValidTicket();
  }

  isValidForNotification(): boolean {
    const now = new Date();
    // 過去の試合は通知対象外
    if (this.props.matchDate <= now) return false;
    // 既に販売開始から1日以上経過している場合は通知対象外
    if (now.getTime() > this.props.saleStartDate.getTime() + 24 * 60 * 60 * 1000) return false;
    return this.isValidTicket();
  }

  private isValidTicket(): boolean {
    return this.props.ticketTypes.length > 0 &&
      this.props.ticketUrl.length > 0 &&
      this.props.venue.length > 0;
  }

  private validateTicketData(props: TicketProps): void {
    if (!props.id || props.id.trim() === '') {
      throw new Error('Ticket ID is required');
    }
    if (!props.matchName || props.matchName.trim() === '') {
      throw new Error('Match name is required');
    }
    if (!props.homeTeam || props.homeTeam.trim() === '') {
      throw new Error('Home team is required');
    }
    if (!props.awayTeam || props.awayTeam.trim() === '') {
      throw new Error('Away team is required');
    }
    if (props.matchDate <= props.saleStartDate) {
      throw new Error('Match date must be after sale start date');
    }
    if (!props.venue || props.venue.trim() === '') {
      throw new Error('Venue is required');
    }
    if (!props.ticketTypes || props.ticketTypes.length === 0) {
      throw new Error('At least one ticket type is required');
    }
    if (!props.ticketUrl || !this.isValidUrl(props.ticketUrl)) {
      throw new Error('Valid ticket URL is required');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  toPlainObject(): TicketProps {
    return { ...this.props };
  }
}

export interface ScrapedTicketData {
  matchName: string;
  matchDate: string;
  saleDate: string;
  ticketTypes: string[];
  ticketUrl: string;
  venue: string;
}
