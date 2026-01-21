import { LocalEvent, RouterOptions } from './types.js';

export interface RoutedEvent {
  event: LocalEvent;
  shouldBarge: boolean;
}

interface RouterState {
  lastEmittedAt: Map<string, number>;
}

export class EventRouter {
  private options: RouterOptions;
  private state: RouterState = {
    lastEmittedAt: new Map(),
  };

  constructor(options: RouterOptions) {
    this.options = options;
  }

  updateOptions(options: Partial<RouterOptions>) {
    this.options.focusMode = options.focusMode ?? this.options.focusMode;
  }

  route(events: LocalEvent[]): RoutedEvent[] {
    const routed: RoutedEvent[] = [];

    for (const event of events) {
      if (this.options.focusMode && event.severity !== 'CRITICAL') {
        continue;
      }

      const lastAt = this.state.lastEmittedAt.get(event.id) ?? 0;
      if (event.t - lastAt < event.cooldownMs) {
        continue;
      }

      this.state.lastEmittedAt.set(event.id, event.t);
      routed.push({
        event,
        shouldBarge: event.severity === 'CRITICAL',
      });
    }

    return routed;
  }
}
