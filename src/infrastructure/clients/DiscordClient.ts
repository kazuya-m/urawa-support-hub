export interface DiscordClientConfig {
  webhookUrl: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

export interface IDiscordClient {
  sendWebhook(payload: DiscordWebhookPayload): Promise<void>;
}

/**
 * Discord Webhook クライアント
 * Discord の Incoming Webhook を使用してメッセージ送信を行う
 */
export class DiscordClient implements IDiscordClient {
  constructor(private readonly config: DiscordClientConfig) {
    if (!config.webhookUrl) {
      throw new Error('Discord webhook URL is required');
    }
  }

  async sendWebhook(payload: DiscordWebhookPayload): Promise<void> {
    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Discord webhook failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
  }
}
