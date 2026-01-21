import { ApiMessage, Recommendation, TelemetryFrame } from '@simracing/core';
import WebSocket from 'ws';

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  private readonly options: ApiClientOptions;
  private ws?: WebSocket;
  private pollTimer?: NodeJS.Timeout;

  constructor(options: ApiClientOptions) {
    this.options = options;
  }

  async sendTelemetry(frames: TelemetryFrame[]): Promise<boolean> {
    if (frames.length === 0) {
      return true;
    }

    try {
      const response = await fetch(`${this.options.baseUrl}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
        },
        body: JSON.stringify({ frames }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  connectRecommendations(
    sessionId: string,
    onMessage: (message: Recommendation) => void,
    onStatus: (status: 'online' | 'offline') => void,
  ) {
    const wsUrl = this.options.baseUrl.replace('http', 'ws');
    const url = `${wsUrl}/recommendations?sessionId=${encodeURIComponent(sessionId)}`;

    this.ws = new WebSocket(url, {
      headers: this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {},
    });

    this.ws.on('open', () => onStatus('online'));
    this.ws.on('close', () => {
      onStatus('offline');
      this.startPolling(sessionId, onMessage);
    });
    this.ws.on('error', () => {
      onStatus('offline');
      this.startPolling(sessionId, onMessage);
    });
    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as ApiMessage;
        onMessage({ ...parsed, source: 'remote' });
      } catch {
        // ignore malformed messages
      }
    });
  }

  disconnectRecommendations() {
    this.ws?.close();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private startPolling(sessionId: string, onMessage: (message: Recommendation) => void) {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.options.baseUrl}/recommendations?sessionId=${encodeURIComponent(sessionId)}`,
          {
            headers: {
              ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
            },
          },
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as ApiMessage[];
        payload.forEach((message) => onMessage({ ...message, source: 'remote' }));
      } catch {
        // ignore polling failures
      }
    }, 3000);
  }
}
