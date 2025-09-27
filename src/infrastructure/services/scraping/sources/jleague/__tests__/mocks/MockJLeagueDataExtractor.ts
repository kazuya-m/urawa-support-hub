import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';
import { IDataExtractor } from '@/infrastructure/services/scraping/shared/interfaces/IDataExtractor.ts';
import { JLeagueRawTicketData } from '../../types/JLeagueTypes.ts';

/**
 * テスト用 JLeagueDataExtractor Mock
 */
export class MockJLeagueDataExtractor implements IDataExtractor<JLeagueRawTicketData> {
  private warnings: string[] = [];
  private mockData: JLeagueRawTicketData[] = [];

  constructor(mockData: JLeagueRawTicketData[] = []) {
    this.mockData = mockData;
  }

  extractTickets(_page: IPage): Promise<JLeagueRawTicketData[]> {
    return Promise.resolve([...this.mockData]);
  }

  extractSingleTicket(
    _page: IPage,
    _containerSelector: string,
  ): Promise<JLeagueRawTicketData | null> {
    return Promise.resolve(this.mockData[0] || null);
  }

  getAndClearWarnings(): string[] {
    const warnings = [...this.warnings];
    this.warnings = [];
    return warnings;
  }

  addWarning(warning: string): void {
    this.warnings.push(warning);
  }

  setMockData(data: JLeagueRawTicketData[]): void {
    this.mockData = data;
  }
}
