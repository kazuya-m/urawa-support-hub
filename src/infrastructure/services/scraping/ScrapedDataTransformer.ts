import { Ticket } from '@/domain/entities/Ticket.ts';
import { ScrapedTicketData } from './types/ScrapedTicketData.ts';
import { ScrapedDataValidator } from './ScrapedDataValidator.ts';
import { TicketDataExtractor } from './TicketDataExtractor.ts';
import { TicketDataMapper } from './TicketDataMapper.ts';

export class ScrapedDataTransformer {
  static async convertToTicketEntities(scrapedData: ScrapedTicketData[]): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    for (const data of scrapedData) {
      try {
        const validationResult = ScrapedDataValidator.validate(data);
        if (!validationResult.isValid) {
          // 不完全データを除外（ログ出力なし）
          continue;
        }

        // オプショナルデータ不足は許容（ログ出力なし）

        const matchName = data.matchName!;
        const matchDateStr = data.matchDate!;
        const saleDateStr = data.saleDate!;

        const venue = data.venue || '';
        const ticketUrl = data.ticketUrl || '';

        if (!matchName || !matchDateStr || !saleDateStr) {
          // 必須データ欠落
          continue;
        }

        const dateValidation = ScrapedDataValidator.validateDateFormats(matchDateStr, saleDateStr);
        if (!dateValidation.isValid || !dateValidation.matchDate || !dateValidation.saleStartDate) {
          // 不正な日付フォーマット
          continue;
        }

        const extractedTeams = TicketDataExtractor.extractTeamsFromMatchName(matchName);
        const homeTeam = data.homeTeam || extractedTeams.homeTeam;
        const awayTeam = data.awayTeam || extractedTeams.awayTeam;

        const validatedData = {
          matchName,
          matchDate: matchDateStr,
          saleDate: saleDateStr,
          venue,
          ticketUrl,
          homeTeam: data.homeTeam,
          awayTeam: data.awayTeam,
          ticketTypes: data.ticketTypes,
        };

        const ticket = await TicketDataMapper.createTicketEntity(
          validatedData,
          dateValidation.matchDate,
          dateValidation.saleStartDate,
          homeTeam,
          awayTeam,
        );

        // チケット作成成功（品質レベルによらず統一処理）

        tickets.push(ticket);
      } catch (error) {
        console.error(
          'Entity conversion failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return tickets;
  }
}
