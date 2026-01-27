import { EventEmitter } from 'node:events';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';

export type AdapterId =
  | 'iracing'
  | 'ams2'
  | 'raceroom'
  | 'rfactor'
  | 'rfactor2'
  | 'automobilista'
  | 'simutc'
  | 'ac'
  | 'acc'
  | 'other';

export type AdapterStatusState = 'waiting' | 'connected' | 'disconnected' | 'error';

export interface AdapterSpec {
  id: AdapterId;
  label: string;
  simName: string;
}

export const ADAPTER_SPECS: AdapterSpec[] = [
  { id: 'iracing', label: 'iRacing', simName: 'iRacing' },
  { id: 'ams2', label: 'AMS2', simName: 'Automobilista 2' },
  { id: 'raceroom', label: 'RaceRoom', simName: 'RaceRoom Racing Experience' },
  { id: 'rfactor', label: 'rFactor', simName: 'rFactor' },
  { id: 'rfactor2', label: 'rFactor 2', simName: 'rFactor 2' },
  { id: 'automobilista', label: 'Automobilista', simName: 'Automobilista' },
  { id: 'simutc', label: 'SimuTC', simName: 'SimuTC' },
  { id: 'ac', label: 'Assetto Corsa', simName: 'Assetto Corsa' },
  { id: 'acc', label: 'ACC', simName: 'Assetto Corsa Competizione' },
  { id: 'other', label: 'Other', simName: 'Other' },
];

export interface NormalizedFrame {
  speed_mps?: number | null;
  rpm?: number | null;
  gear?: number | null;
  throttle_pct?: number | null;
  brake_pct?: number | null;
  steering_rad?: number | null;
  lap?: number | null;
  session_flags_raw?: number | null;
  traffic?: number | string | null;
  temps?: {
    water_c?: number | null;
    oil_c?: number | null;
  } | null;
  tickCount?: number | null;
  tickRate?: number | null;
}

export interface AdapterStatusMessage {
  type: 'status';
  state: AdapterStatusState;
  sim: string;
  details?: string;
}

export interface AdapterFrameMessage {
  type: 'frame';
  sim: string;
  ts: number;
  data: NormalizedFrame;
}

export interface AdapterLogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface AdapterSessionInfoMessage {
  type: 'sessionInfo';
  sim: string;
  ts: number;
  yaml: string;
}

export type AdapterMessage =
  | AdapterStatusMessage
  | AdapterFrameMessage
  | AdapterLogMessage
  | AdapterSessionInfoMessage;

export interface AdapterCommand {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export type AdapterCommandResolver = (
  adapterId: AdapterId,
) => Promise<AdapterCommand | null> | AdapterCommand | null;

export interface AdapterSupervisorOptions {
  adapterId: AdapterId;
  resolveCommand: AdapterCommandResolver;
  env?: NodeJS.ProcessEnv;
}

export class AdapterSupervisor extends EventEmitter {
  private adapterId: AdapterId;
  private resolveCommand: AdapterCommandResolver;
  private env?: NodeJS.ProcessEnv;
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private stopRequested = false;
  private restartAttempts = 0;
  private restartTimer?: NodeJS.Timeout;
  private lastStatus?: AdapterStatusMessage;

  constructor(options: AdapterSupervisorOptions) {
    super();
    this.adapterId = options.adapterId;
    this.resolveCommand = options.resolveCommand;
    this.env = options.env;
  }

  start() {
    this.stopRequested = false;
    this.restartAttempts = 0;
    this.spawnAdapter();
  }

  stop() {
    this.stopRequested = true;
    this.restartAttempts = 0;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = undefined;
    }
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    this.emitStatus({
      type: 'status',
      state: 'disconnected',
      sim: this.adapterId,
      details: 'Stopped',
    });
  }

  private async spawnAdapter() {
    if (this.stopRequested) {
      return;
    }

    const resolved = await this.resolveCommand(this.adapterId);
    if (!resolved) {
      this.emitStatus({
        type: 'status',
        state: 'error',
        sim: this.adapterId,
        details: 'Adapter command not available.',
      });
      return;
    }

    try {
      this.child = spawn(resolved.command, resolved.args, {
        env: { ...process.env, ...this.env, ...resolved.env },
        cwd: resolved.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      this.emitStatus({
        type: 'status',
        state: 'error',
        sim: this.adapterId,
        details: `Failed to start adapter: ${String(error)}`,
      });
      return;
    }

    this.child.stdout.setEncoding('utf8');
    this.child.stderr.setEncoding('utf8');

    this.child.stdout.on('data', (chunk) => this.handleStdout(chunk));
    this.child.stderr.on('data', (chunk) => this.handleStderr(chunk));
    this.child.on('error', (error) => {
      this.emitStatus({
        type: 'status',
        state: 'error',
        sim: this.adapterId,
        details: `Adapter error: ${String(error)}`,
      });
    });
    this.child.on('exit', (code, signal) => this.handleExit(code, signal));
  }

  private handleStdout(chunk: string) {
    this.buffer += chunk;
    while (this.buffer.includes('\n')) {
      const idx = this.buffer.indexOf('\n');
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) {
        continue;
      }
      try {
        const parsed = JSON.parse(line) as AdapterMessage;
        this.handleMessage(parsed);
      } catch (error) {
        this.emit(
          'log',
          {
            type: 'log',
            level: 'warn',
            message: `Invalid adapter output: ${String(error)}`,
          } satisfies AdapterLogMessage,
        );
      }
    }
  }

  private handleStderr(chunk: string) {
    const lines = chunk.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      this.emit(
        'log',
        {
          type: 'log',
          level: 'warn',
          message: line,
        } satisfies AdapterLogMessage,
      );
    }
  }

  private handleMessage(message: AdapterMessage) {
    if (message.type === 'status') {
      this.emitStatus(message);
      return;
    }
    this.emit(message.type, message);
  }

  private emitStatus(message: AdapterStatusMessage) {
    this.lastStatus = message;
    this.emit('status', message);
  }

  private handleExit(code: number | null, signal: NodeJS.Signals | null) {
    this.child = null;
    if (this.stopRequested) {
      return;
    }

    const detail = `Adapter exited (${code ?? 'unknown'}${signal ? ` ${signal}` : ''})`;
    this.emitStatus({
      type: 'status',
      state: 'disconnected',
      sim: this.adapterId,
      details: detail,
    });

    const delays = [1000, 2000, 4000, 8000, 16000, 30000];
    const delay = delays[Math.min(this.restartAttempts, delays.length - 1)];
    this.restartAttempts += 1;
    this.restartTimer = setTimeout(() => this.spawnAdapter(), delay);
  }
}

export function getAdapterSpec(adapterId: AdapterId): AdapterSpec {
  return (
    ADAPTER_SPECS.find((spec) => spec.id === adapterId) ?? {
      id: adapterId,
      label: adapterId,
      simName: adapterId,
    }
  );
}
