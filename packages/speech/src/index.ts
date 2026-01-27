import say from 'say';
import { exec } from 'node:child_process';
import { LocalEvent } from '@simracing/core';

export interface SpeechOptions {
  voice?: string;
  volume: number;
  rate: number;
}

export class SpeechQueue {
  private queue: LocalEvent[] = [];
  private currentProcess: any | null = null;
  private muted = false;
  private focusMode = false;
  private lastSpoken?: LocalEvent;
  private options: SpeechOptions;
  private onSpeak?: (text: string, options: SpeechOptions) => void;
  private speaking = false;

  constructor(options: SpeechOptions, onSpeak?: (text: string, options: SpeechOptions) => void) {
    this.options = options;
    this.onSpeak = onSpeak;
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

  setSpeakHandler(handler: (text: string, options: SpeechOptions) => void) {
    this.onSpeak = handler;
  }

  enqueue(event: LocalEvent, bargeIn: boolean) {
    if (this.focusMode && event.severity !== 'CRITICAL') {
      return;
    }

    console.log(`[SpeechQueue] Enqueuing: "${event.text}" (bargeIn: ${bargeIn}, focus: ${this.focusMode})`);
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
    say.stop();
    this.speaking = false;
  }

  private async playNext(): Promise<void> {
    if (this.speaking || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();
    if (!next || this.muted) {
      return;
    }

    this.lastSpoken = next;

    if (this.onSpeak) {
      this.onSpeak(next.text, this.options);
    }

    this.speaking = true;

    // Explicitly use the selected voice, fallback only if truly empty/null
    const voiceToUse = (this.options.voice && this.options.voice.trim() !== '')
      ? this.options.voice
      : 'Microsoft Sabina Desktop';

    const speed = 1 + (this.options.rate * 0.1);

    console.log(`[SpeechQueue] === SYNTHESIS START ===`);
    console.log(`[SpeechQueue] Text: "${next.text}"`);
    console.log(`[SpeechQueue] Voice from options: "${this.options.voice}"`);
    console.log(`[SpeechQueue] Final voice used: "${voiceToUse}"`);
    console.log(`[SpeechQueue] Speed: ${speed}`);

    return new Promise((resolve) => {
      try {
        // Map 0-100 to SAPI Volume (0-100)
        const volume = Math.max(0, Math.min(100, Math.round(this.options.volume)));
        // Map rate (-10 to 10) to SAPI Rate (-10 to 10)
        const rate = Math.max(-10, Math.min(10, Math.round(this.options.rate)));

        const psCommand = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Volume = ${volume}; $s.Rate = ${rate}; $s.SelectVoice('${voiceToUse}'); $s.Speak('${next.text.replace(/'/g, "''")}')`;
        const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`;

        console.log(`[SpeechQueue] Executing synthesis: volume=${volume}, rate=${rate}, voice="${voiceToUse}"`);

        this.currentProcess = exec(command, (err: any) => {
          if (err) {
            console.error('[SpeechQueue] PS Synthesis error:', err);
          }
          this.speaking = false;
          this.currentProcess = null;
          resolve();
          void this.playNext();
        });
      } catch (e) {
        console.error('[SpeechQueue] Synthesis exception:', e);
        this.speaking = false;
        resolve();
        void this.playNext();
      }
    });
  }

  static async getAvailableVoices(): Promise<string[]> {
    return new Promise((resolve) => {
      try {
        // This command returns the exact names recognized by the SAPI engine
        const command = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices().VoiceInfo.Name"';

        console.log('[SpeechQueue] Discovery starts (using System.Speech)...');

        exec(command, (err: any, stdout: string) => {
          if (err) {
            console.error('[SpeechQueue] PS Discovery error:', err);
            resolve(['Microsoft Sabina Desktop', 'Microsoft David Desktop', 'Microsoft Zira Desktop']);
            return;
          }

          if (!stdout || stdout.trim().length === 0) {
            console.warn('[SpeechQueue] PS Discovery returned empty');
            resolve(['Microsoft Sabina Desktop', 'Microsoft David Desktop', 'Microsoft Zira Desktop']);
            return;
          }

          const voices = stdout
            .replace(/\r/g, '')
            .split('\n')
            .map(v => v.trim())
            .filter(v => v.length > 0);

          const uniqueVoices = [...new Set(voices)].sort();
          console.log(`[SpeechQueue] Discovered ${uniqueVoices.length} voices:`, uniqueVoices);
          resolve(uniqueVoices);
        });
      } catch (e) {
        console.error('[SpeechQueue] Discovery exception:', e);
        resolve(['Microsoft Sabina Desktop', 'Microsoft David Desktop', 'Microsoft Zira Desktop']);
      }
    });
  }
}
