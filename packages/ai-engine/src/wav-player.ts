/**
 * Direct WAV Audio Player - NO PIPER
 * Plays pre-rendered WAV files with PowerShell
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function playWavFile(ruleId: string): Promise<void> {
    const wavPath = path.join(__dirname, `../../../core/ai_engines/piper/prerendered/${ruleId}.wav`);

    const startTime = Date.now();
    console.log(`[DirectWAV] ⚡ ${ruleId}.wav`);

    const psScript = `
        $player = New-Object System.Media.SoundPlayer('${wavPath}')
        $player.PlaySync()
    `;

    await new Promise<void>((resolve, reject) => {
        const ps = spawn('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            psScript
        ]);

        ps.on('close', (code) => {
            code === 0 ? resolve() : reject(new Error(`PowerShell exit ${code}`));
        });

        ps.stderr.on('data', (data) => {
            console.error('[DirectWAV] Error:', data.toString());
        });
    });

    const totalTime = Date.now() - startTime;
    console.log(`[DirectWAV] ✅ ${totalTime}ms`);
}
