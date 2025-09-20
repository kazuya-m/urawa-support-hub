import { Ticket } from '@/domain/entities/Ticket.ts';

/**
 * 試合名を「〇〇 vs 〇〇」形式で統一表示するヘルパー関数
 */
export function formatMatchName(ticket: Ticket): string {
  if (ticket.homeTeam && ticket.awayTeam) {
    return `${ticket.homeTeam} vs ${ticket.awayTeam}`;
  }
  return ticket.matchName;
}
