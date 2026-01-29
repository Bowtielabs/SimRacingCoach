import { exec } from 'node:child_process';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);

/**
 * Piper TTS wrapper - uses local AI voice model
 * NO WINDOWS TTS - pure AI model
 */
export class PiperTTS {
    private piperPath: string;
    private modelPath: string;
    private outputDir: string;

    constructor() {
        const rootDir = process.cwd();
        this.piperPath = path.join(rootDir, 'models', 'piper', 'piper.exe');
        this.modelPath = path.join(rootDir, 'models', 'piper', 'es_ES-davefx-medium.onnx');
        this.outputDir = path.join(rootDir, 'temp');
    }

    /**
     * Speak text using Piper AI voice (Spanish male)
     */
    async speak(text: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // Ensure temp directory exists
                await fs.mkdir(this.outputDir, { recursive: true });

                const outputFile = path.join(this.outputDir, `speech_${Date.now()}.wav`);

                console.log(`[PiperTTS] Speaking: "${text}"`);
                console.log(`[PiperTTS] Using model: ${this.modelPath}`);

                // Run Piper to generate WAV file using spawn for stdin
                const piper = spawn(this.piperPath, [
                    '-m', this.modelPath,
                    '-f', outputFile
                ]);

                // Send text via stdin
                piper.stdin.write(text);
                piper.stdin.end();

                piper.on('close', async (code) => {
                    if (code !== 0) {
                        reject(new Error(`Piper exited with code ${code}`));
                        return;
                    }

                    console.log(`[PiperTTS] Generated audio: ${outputFile}`);

                    // Play the WAV file using PowerShell
                    try {
                        const playCommand = `powershell -c "(New-Object Media.SoundPlayer '${outputFile}').PlaySync()"`;
                        await execAsync(playCommand, { timeout: 60000 });
                        console.log(`[PiperTTS] Playback complete`);

                        // Clean up
                        await fs.unlink(outputFile).catch(() => { });
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });

                piper.on('error', (err) => {
                    reject(err);
                });
            } catch (error) {
                console.error('[PiperTTS] Error:', error);
                reject(error);
            }
        });
    }
}
