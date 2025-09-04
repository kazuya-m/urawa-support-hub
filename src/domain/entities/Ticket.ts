import { NotificationType, shouldSendNotificationAtTime } from './NotificationTypes.ts';
import { DataQuality, determineDataQuality } from './DataQuality.ts';

interface TicketProps {
  id: string;
  matchName: string;
  matchDate: Date;
  homeTeam?: string;
  awayTeam?: string;
  saleStartDate: Date | null;
  saleStartTime?: string;
  saleEndDate?: Date;
  venue?: string;
  ticketTypes?: string[];
  ticketUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  scrapedAt: Date;
  saleStatus: 'before_sale' | 'on_sale' | 'ended';
  notificationScheduled?: boolean;
}

export class Ticket {
  private readonly props: TicketProps;

  private constructor(props: TicketProps) {
    this.validateTicketData(props);
    this.props = { ...props };
  }

  static async createNew(
    props: Omit<TicketProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Ticket> {
    const id = await Ticket.generateId(props.matchName, props.matchDate);
    return new Ticket({
      ...props,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromExisting(props: TicketProps): Ticket {
    if (!props.id || props.id.trim() === '') {
      throw new Error('ID is required for existing ticket');
    }
    return new Ticket(props);
  }

  static async generateId(matchName: string, matchDate: Date): Promise<string> {
    const normalizedName = this.normalizeMatchName(matchName);
    const dateStr = matchDate.toISOString().split('T')[0];

    const encoder = new TextEncoder();
    const data = encoder.encode(`${normalizedName}-${dateStr}`);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return [
      hashHex.substring(0, 8),
      hashHex.substring(8, 12),
      '5' + hashHex.substring(13, 16),
      ((parseInt(hashHex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') +
      hashHex.substring(18, 20),
      hashHex.substring(20, 32),
    ].join('-');
  }

  private static normalizeMatchName(matchName: string): string {
    return matchName
      .trim()
      .replace(/\s+/g, '')
      .replace(/　/g, '')
      .replace(/[vｖ][sｓ]/gi, 'vs')
      .replace(/戦$/g, '')
      .toLowerCase();
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
  get homeTeam(): string | undefined {
    return this.props.homeTeam;
  }
  get awayTeam(): string | undefined {
    return this.props.awayTeam;
  }
  get saleStartDate(): Date | null {
    return this.props.saleStartDate;
  }
  get saleStartTime(): string | undefined {
    return this.props.saleStartTime;
  }
  get venue(): string | undefined {
    return this.props.venue;
  }
  get ticketTypes(): string[] {
    return this.props.ticketTypes ? [...this.props.ticketTypes] : [];
  }
  get ticketUrl(): string | undefined {
    return this.props.ticketUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get saleEndDate(): Date | undefined {
    return this.props.saleEndDate;
  }

  get scrapedAt(): Date {
    return this.props.scrapedAt;
  }

  get saleStatus(): 'before_sale' | 'on_sale' | 'ended' {
    return this.props.saleStatus;
  }

  get notificationScheduled(): boolean {
    return this.props.notificationScheduled ?? false;
  }

  shouldSendNotification(type: NotificationType, currentTime: Date = new Date()): boolean {
    if (!this.props.saleStartDate) return false;
    return shouldSendNotificationAtTime(type, this.props.saleStartDate, currentTime);
  }

  isOnSale(): boolean {
    return this.props.saleStatus === 'on_sale';
  }

  isBeforeSale(): boolean {
    return this.props.saleStatus === 'before_sale';
  }

  isSaleEnded(): boolean {
    return this.props.saleStatus === 'ended';
  }

  requiresNotification(): boolean {
    return this.isBeforeSale() && !this.notificationScheduled && this.props.saleStartDate !== null;
  }

  isValidForNotification(): boolean {
    const now = new Date();
    if (this.props.matchDate <= now) return false;
    if (!this.props.saleStartDate) return false;
    if (now.getTime() > this.props.saleStartDate.getTime() + 24 * 60 * 60 * 1000) return false;
    return this.isValidTicket();
  }

  getDataQuality(): DataQuality {
    return determineDataQuality({
      hasTicketUrl: !!this.props.ticketUrl && this.props.ticketUrl.trim() !== '',
      hasVenue: !!this.props.venue && this.props.venue.trim() !== '',
      hasTicketTypes: !!this.props.ticketTypes && this.props.ticketTypes.length > 0,
    });
  }

  private isValidTicket(): boolean {
    return !!this.props.matchName &&
      !!this.props.matchDate &&
      !!this.props.saleStartDate;
  }

  private validateTicketData(props: TicketProps): void {
    if (!props.id || props.id.trim() === '') {
      throw new Error('Ticket ID is required');
    }
    if (!props.matchName || props.matchName.trim() === '') {
      throw new Error('Match name is required');
    }
    if (props.homeTeam !== undefined && props.homeTeam.trim() === '') {
      throw new Error('Home team cannot be empty string');
    }
    if (props.awayTeam !== undefined && props.awayTeam.trim() === '') {
      throw new Error('Away team cannot be empty string');
    }
    if (props.venue !== undefined && props.venue.trim() === '') {
      throw new Error('Venue cannot be empty string');
    }
    if (props.saleStartDate && props.matchDate <= props.saleStartDate) {
      throw new Error('Match date must be after sale start date');
    }
    if (props.ticketUrl && props.ticketUrl.trim() !== '' && !this.isValidUrl(props.ticketUrl)) {
      throw new Error('Invalid ticket URL format');
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

  needsNotificationReschedule(existing: Ticket): boolean {
    return (
      this.saleStartDate?.getTime() !== existing.saleStartDate?.getTime() ||
      !this.areTicketTypesEqual(existing.ticketTypes) ||
      this.ticketUrl !== existing.ticketUrl
    );
  }

  hasDataChanges(existing: Ticket): boolean {
    return (
      this.needsNotificationReschedule(existing) ||
      this.saleEndDate?.getTime() !== existing.saleEndDate?.getTime() ||
      this.saleStatus !== existing.saleStatus ||
      this.scrapedAt.getTime() !== existing.scrapedAt.getTime() ||
      this.notificationScheduled !== existing.notificationScheduled
    );
  }

  equals(other: Ticket): boolean {
    return this.id === other.id;
  }

  private areTicketTypesEqual(otherTypes: string[]): boolean {
    if (this.ticketTypes.length !== otherTypes.length) return false;

    const sortedCurrent = [...this.ticketTypes].sort();
    const sortedOther = [...otherTypes].sort();

    return sortedCurrent.every((type, index) => type === sortedOther[index]);
  }

  toPlainObject(): TicketProps {
    return { ...this.props };
  }
}
