export interface ScrapingConfig {
  awayTabSelectors: string[];
  selectors: {
    ticketContainer: string[];
    matchTitle: string[];
    matchDate: string[];
    saleDate: string[];
    ticketType: string[];
    venue: string[];
    ticketLink: string[];
  };
  awayKeywords: string[];
  generalSaleKeyword: string;
  timeouts: {
    pageLoad: number;
    elementWait: number;
    tabSwitch: number;
  };
}
