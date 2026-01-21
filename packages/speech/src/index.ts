import { spawn } from 'node:child_process';
import { LocalEvent } from '@simracing/core';

export interface SpeechOptions {
  voice?: string;
  volume: number;
  rate: number;
}

export class SpeechQueue {
  private queue: LocalEvent[] = [];
  private currentProcess: ReturnType<typeof spawn> | null = null;
  private muted = false;
  private focusMode = false;
  private lastSpoken?: LocalEvent;
  private options: SpeechOptions;

  constructor(options: SpeechOptions) {
    this.options = options;
  }

  updateOptions(options: Partial<SpeechOptions>) {
    this.options = { ...this.options, ...options };
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  toggleFocusMode() {
    this.focusMode = !this.focusMode;
  }

  setFocusMode(value: boolean) {
    this.focusMode = value;
  }

  enqueue(event: LocalEvent, bargeIn: boolean) {
    if (this.focusMode && event.severity !== 'CRITICAL') {
      return;
    }

    if (bargeIn) {
      this.interrupt();
      this.queue.unshift(event);
    } else {
      this.queue.push(event);
    }

    void this.playNext();
  }

  repeatLast() {
    if (this.lastSpoken) {
      this.enqueue(this.lastSpoken, true);
    }
  }

  private interrupt() {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
  }

  private async playNext(): Promise<void> {
    if (this.currentProcess || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();
    if (!next || this.muted) {
      return;
    }

    this.lastSpoken = next;
    this.currentProcess = speakWindows(next.text, this.options);

    await new Promise<void>((resolve) => {
      this.currentProcess?.on('exit', () => {
        this.currentProcess = null;
        resolve();
      });
    });

    await this.playNext();
  }
}

function speakWindows(text: string, options: SpeechOptions) {
  const voiceLine = options.voice
    ? `$voice = $speak.GetVoices() | Where-Object { $_.GetDescription() -like '*${options.voice}*' } | Select-Object -First 1; if ($voice) { $speak.Voice = $voice }`
    : '';

  const command = `Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; ${voiceLine} $speak.Volume = ${options.volume}; $speak.Rate = ${options.rate}; $speak.Speak('${sanitize(text)}');`;

  return spawn('powershell', ['-Command', command], {
    windowsHide: true,
  });
}

function sanitize(text: string) {
  return text.replace(/'/g, "''");
}
