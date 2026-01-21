import { LocalEvent } from './types.js';

export type FlagType = 'yellow' | 'black' | 'blue';

const FLAG_BITS = {
  yellow: 0x00000008,
  black: 0x00010000,
  blue: 0x00000020,
};

export interface FlagEvent {
  type: FlagType;
  event: LocalEvent;
}

export function decodeFlags(mask: number, t: number): FlagEvent[] {
  const events: FlagEvent[] = [];

  if ((mask & FLAG_BITS.yellow) !== 0) {
    events.push({
      type: 'yellow',
      event: {
        id: 'flags.yellow',
        t,
        category: 'FLAGS',
        severity: 'WARNING',
        priority: 3,
        cooldownMs: 4000,
        text: 'Bandera amarilla',
        source: 'local',
      },
    });
  }

  if ((mask & FLAG_BITS.black) !== 0) {
    events.push({
      type: 'black',
      event: {
        id: 'flags.black',
        t,
        category: 'FLAGS',
        severity: 'CRITICAL',
        priority: 5,
        cooldownMs: 4000,
        text: 'Bandera negra',
        source: 'local',
      },
    });
  }

  if ((mask & FLAG_BITS.blue) !== 0) {
    events.push({
      type: 'blue',
      event: {
        id: 'flags.blue',
        t,
        category: 'FLAGS',
        severity: 'INFO',
        priority: 2,
        cooldownMs: 4000,
        text: 'Bandera azul',
        source: 'local',
      },
    });
  }

  return events;
}
