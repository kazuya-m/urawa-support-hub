import { ILineClient, LineMessage } from '@/infrastructure/clients/LineClient.ts';

export class MockLineClient implements ILineClient {
  public broadcastCalls: Array<{ message: LineMessage }> = [];
  public pushCalls: Array<{ to: string; message: LineMessage }> = [];

  private shouldThrow = false;
  private errorMessage = 'Mock LINE client error';

  setThrowError(shouldThrow: boolean, message = 'Mock LINE client error') {
    this.shouldThrow = shouldThrow;
    this.errorMessage = message;
  }

  async broadcast(message: LineMessage): Promise<void> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }

    // Mock処理をawaitで待機
    await Promise.resolve();
    this.broadcastCalls.push({ message });
  }

  async push(to: string, message: LineMessage): Promise<void> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }

    // Mock処理をawaitで待機
    await Promise.resolve();
    this.pushCalls.push({ to, message });
  }

  reset() {
    this.broadcastCalls = [];
    this.pushCalls = [];
    this.shouldThrow = false;
  }
}
