import { Ticket } from '@/domain/entities/Ticket.ts';
import { ScrapedTicketData } from '../types/ScrapedTicketData.ts';
import { TicketDataParser } from './components/TicketDataParser.ts';
import { TicketDataMapper } from './components/TicketDataMapper.ts';

export interface SkippedTicket {
  rawData: ScrapedTicketData;
  reason: string;
  matchName: string;
}

export interface TransformResult {
  tickets: Ticket[];
  skippedTickets: SkippedTicket[];
  warningCount: number;
}

export class ScrapedDataTransformer {
  static async transform(scrapedData: ScrapedTicketData[]): Promise<TransformResult> {
    const tickets: Ticket[] = [];
    const skippedTickets: SkippedTicket[] = [];
    let totalWarnings = 0;

    for (const rawTicket of scrapedData) {
      const parseResult = TicketDataParser.parseAndValidate(rawTicket);

      if (parseResult.success) {
        try {
          // マッパー呼び出し（構造化データ → エンティティ）
          const ticket = await TicketDataMapper.toEntity(parseResult.data!);
          tickets.push(ticket);
          totalWarnings += parseResult.warnings.length;

          // 警告がある場合はログ出力
          if (parseResult.warnings.length > 0) {
            console.log(
              `[WARNINGS] Ticket processed with ${parseResult.warnings.length} warnings:`,
              parseResult.warnings,
            );
          }
        } catch (error) {
          // マッピングエラーもスキップ対象として処理
          const errorMessage = error instanceof Error ? error.message : String(error);
          skippedTickets.push({
            rawData: rawTicket,
            reason: `Mapping failed: ${errorMessage}`,
            matchName: rawTicket.matchName || 'Unknown',
          });
          console.error(`[SKIP] Ticket mapping failed: ${errorMessage}`);
        }
      } else {
        skippedTickets.push({
          rawData: rawTicket,
          reason: parseResult.skipReason!,
          matchName: rawTicket.matchName || 'Unknown',
        });
        console.error(`[SKIP] Ticket skipped: ${parseResult.skipReason}`);
      }
    }

    // 集計ログ
    console.log(
      `[SUMMARY] Processed ${tickets.length} tickets, ` +
        `skipped ${skippedTickets.length}, ` +
        `total warnings: ${totalWarnings}`,
    );

    return {
      tickets,
      skippedTickets,
      warningCount: totalWarnings,
    };
  }
}
