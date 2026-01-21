import type { LocalEvent } from "../../../packages/core/src/types";

export class SpeechQueue {
  private queue: LocalEvent[] = [];
  private speaking = false;

  enqueue(ev: LocalEvent) {
    this.queue.push(ev);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  async tick(speak: (text: string) => Promise<void>) {
    if (this.speaking) return;
    const next = this.queue.shift();
    if (!next) return;

    this.speaking = true;
    try {
      await speak(next.text);
    } finally {
      this.speaking = false;
    }
  }
}
