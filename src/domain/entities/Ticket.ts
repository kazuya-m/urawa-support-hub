import {
  NotificationType,
  shouldSendNotificationAtTime,
} from '@/domain/config/NotificationConfig.ts';
import { DataQuality, determineDataQuality } from './DataQuality.ts';
import { formatDateOnly } from '@/shared/utils/datetime.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';
import fastDeepEqual from 'fast-deep-equal';

interface TicketProps {
  id: string;
  matchName: string;
  matchDate: Date;
  homeTeam: string | null;
  awayTeam: string | null;
  competition: string | null; // 大会名フィールド（例: "J1リーグ", "ルヴァンカップ"）
  saleStartDate: Date | null;
  saleEndDate: Date | null;
  venue: string | null;
  ticketTypes: string[] | null;
  ticketUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  scrapedAt: Date;
  saleStatus: SaleStatus | null;
  notificationScheduled: boolean;
}

export class Ticket {
  private readonly props: TicketProps;

  private constructor(props: TicketProps) {
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
    return new Ticket(props);
  }

  static async generateId(matchName: string, matchDate: Date): Promise<string> {
    const normalizedName = this.normalizeMatchName(matchName);
    const dateStr = formatDateOnly(matchDate);

    const encoder = new TextEncoder();
    const data = encoder.encode(`${normalizedName}-${dateStr}`);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

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

  get homeTeam(): string | null {
    return this.props.homeTeam;
  }

  get awayTeam(): string | null {
    return this.props.awayTeam;
  }

  get competition(): string | null {
    return this.props.competition;
  }

  get saleStartDate(): Date | null {
    return this.props.saleStartDate;
  }

  get saleEndDate(): Date | null {
    return this.props.saleEndDate;
  }

  get venue(): string | null {
    return this.props.venue;
  }

  get ticketTypes(): string[] {
    return this.props.ticketTypes ? [...this.props.ticketTypes] : [];
  }

  get ticketUrl(): string | null {
    return this.props.ticketUrl;
  }

  get saleStatus(): SaleStatus | null {
    return this.props.saleStatus;
  }

  get notificationScheduled(): boolean {
    return this.props.notificationScheduled;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get scrapedAt(): Date {
    return this.props.scrapedAt;
  }

  isValidForNotification(): boolean {
    const now = new Date();
    if (this.props.matchDate <= now) return false;
    if (!this.props.saleStartDate) return false;
    if (now.getTime() > this.props.saleStartDate.getTime() + 24 * 60 * 60 * 1000) return false;
    return !!this.props.matchName &&
      !!this.props.matchDate &&
      !!this.props.saleStartDate;
  }

  getDataQuality(): DataQuality {
    return determineDataQuality({
      hasTicketUrl: !!this.props.ticketUrl && this.props.ticketUrl.trim() !== '',
      hasVenue: !!this.props.venue && this.props.venue.trim() !== '',
      hasTicketTypes: !!this.props.ticketTypes && this.props.ticketTypes.length > 0,
    });
  }

  equals(other: Ticket): boolean {
    return this.id === other.id;
  }

  hasSameBusinessData(other: Ticket | null): boolean {
    if (!other) return false;

    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      scrapedAt: _scrapedAt,
      notificationScheduled: _notificationScheduled,
      ...thisBusinessData
    } = this.props;
    const {
      id: _otherId,
      createdAt: _otherCreatedAt,
      updatedAt: _otherUpdatedAt,
      scrapedAt: _otherScrapedAt,
      notificationScheduled: _otherNotificationScheduled,
      ...otherBusinessData
    } = other.props;

    return fastDeepEqual(thisBusinessData, otherBusinessData);
  }

  shouldSendNotification(type: NotificationType, currentTime: Date = new Date()): boolean {
    if (!this.props.saleStartDate) return false;
    return shouldSendNotificationAtTime(type, this.props.saleStartDate, currentTime);
  }

  requiresNotification(): boolean {
    return this.saleStatus === 'before_sale' && !this.notificationScheduled &&
      this.props.saleStartDate !== null;
  }

  /**
   * 通知をスケジューリングすべきかの判定（要件準拠）
   * 有効期限内で発売前のチケット（データ品質に関係なく通知）
   */
  shouldScheduleNotification(): boolean {
    return this.isValidForNotification() &&
      this.saleStatus === 'before_sale' &&
      !this.notificationScheduled;
  }

  /**
   * 既存チケットと比較して通知の再スケジュールが必要かを判定
   * saleStartDateが変更された場合にtrueを返す
   */
  needsNotificationReschedule(existing: Ticket): boolean {
    return (
      this.saleStartDate?.getTime() !== existing.saleStartDate?.getTime() ||
      !this.areTicketTypesEqual(existing.ticketTypes) ||
      this.ticketUrl !== existing.ticketUrl
    );
  }

  /**
   * 既存チケットで通知再スケジュールが必要かを判定
   */
  shouldRescheduleNotification(previousTicket: Ticket | null): boolean {
    if (!previousTicket) return false;

    return this.needsNotificationReschedule(previousTicket) && this.shouldScheduleNotification();
  }

  markNotificationScheduled(): Ticket {
    return Ticket.fromExisting({
      ...this.props,
      notificationScheduled: true,
      updatedAt: new Date(),
    });
  }

  /**
   * 新しいチケットデータとマージし、特定フィールドは既存値を保持
   * 保持するフィールド: id, createdAt, notificationScheduled
   * 新しい値を使用: その他のビジネスデータ、scrapedAt
   * 自動更新: updatedAt（ビジネスデータが変更された場合のみ）
   */
  mergeWith(newTicket: Ticket): Ticket {
    // ビジネスデータが同じ場合は scraped_at のみを更新
    if (this.hasSameBusinessData(newTicket)) {
      return Ticket.fromExisting({
        ...this.props,
        scrapedAt: newTicket.scrapedAt,
        // ビジネスデータが変わらない場合は updatedAt を更新しない
      });
    }

    // ビジネスデータが異なる場合は全体をマージし、updatedAtも更新
    return Ticket.fromExisting({
      ...newTicket.toPlainObject(),
      // 既存の値を保持するフィールド
      id: this.props.id,
      createdAt: this.props.createdAt,
      notificationScheduled: this.props.notificationScheduled,
      // 自動更新されるフィールド
      updatedAt: new Date(),
      // scrapedAtは新しい値を使用（newTicket.toPlainObject()から取得）
    });
  }

  toPlainObject(): TicketProps {
    return { ...this.props };
  }

  private areTicketTypesEqual(otherTypes: string[]): boolean {
    if (this.ticketTypes.length !== otherTypes.length) return false;

    const sortedCurrent = [...this.ticketTypes].sort();
    const sortedOther = [...otherTypes].sort();

    return sortedCurrent.every((type, index) => type === sortedOther[index]);
  }
}
