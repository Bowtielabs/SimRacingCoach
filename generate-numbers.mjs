/**
 * Script para pre-renderizar NUMEROS y FRASES DE VUELTA con Piper
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PIPER_BIN_PATH = path.join(__dirname, 'core/ai_engines/piper/piper/piper.exe');
const VOICE_PATH = path.join(__dirname, 'core/ai_engines/piper/es_AR-daniela.onnx');
const OUTPUT_DIR = path.join(__dirname, 'core/ai_engines/piper/prerendered');
const SAMPLE_RATE = 22050;
const SPEED = 3.5; // Misma velocidad que el resto

const MESSAGES = {
    'num_0': 'cero',
    'num_1': 'uno',
    'num_2': 'dos',
    'num_3': 'tres',
    'num_4': 'cuatro',
    'num_5': 'cinco',
    'num_6': 'seis',
    'num_7': 'siete',
    'num_8': 'ocho',
    'num_9': 'nueve',
    'num_point': 'punto',
    'lap_time_intro': 'Tiempo',
    'lap_improved': '¡Buena vuelta! Bajaste el tiempo',
    'lap_worse': 'Vuelta lenta, a concentrarse'
};

function createWavHeader(dataLength) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(SAMPLE_RATE, 24);
    header.writeUInt32LE(SAMPLE_RATE * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);
    return header;
}

async function renderAudio(ruleId, text) {
    console.log(`\n🔊 [${ruleId}] Sintetizando...`);
    const start = Date.now();
    const pcmChunks = [];

    const piper = spawn(PIPER_BIN_PATH, [
        '--model', VOICE_PATH,
        '--output_raw',
        '--length_scale', (1.0 / SPEED).toFixed(2)
    ]);

    piper.stdin.write(text);
    piper.stdin.end();
    piper.stdout.on('data', (chunk) => pcmChunks.push(chunk));
    piper.stderr.on('data', () => { });

    await new Promise((resolve, reject) => {
        piper.on('close', (code) => code !== 0 ? reject(new Error(`Piper ${code}`)) : resolve());
    });

    const pcmData = Buffer.concat(pcmChunks);
    const wavData = Buffer.concat([createWavHeader(pcmData.length), pcmData]);
    const outputPath = path.join(OUTPUT_DIR, `${ruleId}.wav`);

    writeFileSync(outputPath, wavData);

    const duration = (pcmData.length / (SAMPLE_RATE * 2)) * 1000;
    const elapsed = Date.now() - start;
    console.log(`   ✅ Generado en ${elapsed}ms, duración: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   📁 ${outputPath}`);

    return { ruleId, duration, elapsed };
}

async function main() {
    console.log('🎬 GENERANDO NUMEROS Y FRASES DE VUELTA\n');
    console.log('='.repeat(70));
    console.log(`📝 Total de mensajes: ${Object.keys(MESSAGES).length}`);

    mkdirSync(OUTPUT_DIR, { recursive: true });

    const results = [];

    for (const [ruleId, text] of Object.entries(MESSAGES)) {
        try {
            const result = await renderAudio(ruleId, text);
            results.push(result);
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETADO');
}

main().catch(console.error);
