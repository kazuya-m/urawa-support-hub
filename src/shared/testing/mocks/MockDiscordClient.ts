import { DiscordWebhookPayload, IDiscordClient } from '@/infrastructure/clients/DiscordClient.ts';

export class MockDiscordClient implements IDiscordClient {
  public webhookCalls: Array<{ payload: DiscordWebhookPayload }> = [];

  private shouldThrow = false;
  private errorMessage = 'Mock Discord client error';

  setThrowError(shouldThrow: boolean, message = 'Mock Discord client error') {
    this.shouldThrow = shouldThrow;
    this.errorMessage = message;
  }

  async sendWebhook(payload: DiscordWebhookPayload): Promise<void> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }

    // Mock処理をawaitで待機
    await Promise.resolve();
    this.webhookCalls.push({ payload });
  }

  reset() {
    this.webhookCalls = [];
    this.shouldThrow = false;
  }
}
