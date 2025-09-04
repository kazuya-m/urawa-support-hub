import { Ticket } from '@/domain/entities/Ticket.ts';
import { ValidatedTicketData } from '../../types/ValidationResult.ts';
import { ScrapedTicketData } from '../../types/ScrapedTicketData.ts';
import { parseSaleDate } from '@/domain/entities/SaleStatusUtils.ts';
import type { ParsedTicketData } from './TicketDataParser.ts';

export class TicketDataMapper {
  static async createTicketFromScrapedData(
    scrapedData: ScrapedTicketData,
    matchDate: Date,
  ): Promise<Ticket> {
    const saleInfo = parseSaleDate(scrapedData.saleDate || '');

    const ticket = await Ticket.createNew({
      matchName: scrapedData.matchName,
      matchDate,
      homeTeam: scrapedData.homeTeam || undefined,
      awayTeam: scrapedData.awayTeam || undefined,
      saleStartDate: saleInfo.saleStartDate || new Date(),
      saleEndDate: saleInfo.saleEndDate,
      venue: scrapedData.venue || '',
      ticketTypes: scrapedData.ticketTypes || [],
      ticketUrl: scrapedData.ticketUrl || '',
      scrapedAt: scrapedData.scrapedAt,
      saleStatus: scrapedData.saleStatus,
      notificationScheduled: false,
    });

    return ticket;
  }

  static async createTicketEntity(
    validatedData: ValidatedTicketData,
    matchDate: Date,
    saleStartDate: Date,
    homeTeam?: string,
    awayTeam?: string,
  ): Promise<Ticket> {
    const ticket = await Ticket.createNew({
      matchName: validatedData.matchName,
      matchDate,
      homeTeam,
      awayTeam,
      saleStartDate,
      venue: validatedData.venue || undefined, // Allow undefined, don't force empty string
      ticketTypes: validatedData.ticketTypes || [],
      ticketUrl: validatedData.ticketUrl || undefined, // Allow undefined, don't force empty string
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
      notificationScheduled: false,
    });

    return ticket;
  }

  /**
   * パースされたデータをTicketエンティティに変換する統合メソッド
   * ParsedTicketDataからドメインエンティティへの変換を行う
   */
  static async toEntity(parsedData: ParsedTicketData): Promise<Ticket> {
    const ticket = await Ticket.createNew({
      matchName: parsedData.matchName,
      matchDate: parsedData.matchDate,
      homeTeam: parsedData.homeTeam,
      awayTeam: parsedData.awayTeam,
      saleStartDate: parsedData.saleStartDate,
      venue: parsedData.venue, // Allow undefined, don't force empty string
      ticketTypes: parsedData.ticketTypes,
      ticketUrl: parsedData.ticketUrl, // Allow undefined, don't force empty string
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
      notificationScheduled: false,
    });

    return ticket;
  }

  /**
   * フィールドのデフォルト値を取得する
   * 値が存在しないかemptyの場合はデフォルト値を返す
   */
  private static getDefaultValue(value: string | undefined, defaultValue: string): string {
    return value && value.trim() !== '' ? value : defaultValue;
  }
}
