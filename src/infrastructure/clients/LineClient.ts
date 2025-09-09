export interface LineClientConfig {
  channelAccessToken: string;
}

export interface LineMessage {
  type: string;
  [key: string]: unknown;
}

export interface ILineClient {
  broadcast(message: LineMessage): Promise<void>;
  push(to: string, message: LineMessage): Promise<void>;
}

/**
 * LINE Messaging API クライアント
 * LINE Bot API を使用してメッセージ送信を行う
 */
export class LineClient implements ILineClient {
  constructor(private readonly config: LineClientConfig) {
    if (!config.channelAccessToken) {
      throw new Error('LINE Channel Access Token is required');
    }
  }

  async broadcast(message: LineMessage): Promise<void> {
    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [message],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LINE broadcast failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
  }

  async push(to: string, message: LineMessage): Promise<void> {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages: [message],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LINE push message failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }
  }
}
