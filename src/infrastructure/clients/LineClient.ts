import type { LineClientConfig } from '@/config/app-config.ts';

export interface LineMessage {
  type: string;
  [key: string]: unknown;
}

export type BroadcastResult =
  | { kind: 'accepted' }
  | { kind: 'already_accepted' }
  | { kind: 'rejected'; status: number; detail: string }
  | { kind: 'retryable'; detail: string };

const BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';
const REQUEST_TIMEOUT_MS = 30_000;

export class LineClient {
  constructor(private readonly config: LineClientConfig) {
    if (!config.channelAccessToken) {
      throw new Error('LINE Channel Access Token is required');
    }
  }

  async broadcast(message: LineMessage): Promise<void> {
    const response = await fetch(BROADCAST_URL, {
      method: 'POST',
      headers: this.headers(),
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

  async broadcastWithRetryKey(message: LineMessage, retryKey: string): Promise<BroadcastResult> {
    let response: Response;
    try {
      response = await fetch(BROADCAST_URL, {
        method: 'POST',
        headers: { ...this.headers(), 'X-Line-Retry-Key': retryKey },
        body: JSON.stringify({ messages: [message] }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      return { kind: 'retryable', detail: error instanceof Error ? error.message : String(error) };
    }

    if (response.ok) {
      await response.body?.cancel();
      return { kind: 'accepted' };
    }

    const detail = `${response.status} ${await response.text().catch(() => '')}`.trim();
    if (response.status === 409) return { kind: 'already_accepted' };
    if (response.status >= 400 && response.status < 500) {
      return { kind: 'rejected', status: response.status, detail };
    }
    return { kind: 'retryable', detail };
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.channelAccessToken}`,
      'Content-Type': 'application/json',
    };
  }
}
