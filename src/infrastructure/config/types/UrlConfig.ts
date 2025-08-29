export interface UrlConfig {
  readonly staticUrls: {
    readonly jleagueTicketBase: string;
    readonly urawaClubPage: string;
    readonly lineApiBase: string;
    readonly lineApiBroadcast: string;
    readonly lineApiInfo: string;
    readonly sitemapUrl: string;
  };
  environmentUrls: {
    webhookUrl?: string;
    debugUrl?: string;
  };
}
