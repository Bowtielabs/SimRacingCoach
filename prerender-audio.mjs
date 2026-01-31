/**
 * Script para pre-renderizar todos los mensajes de reglas con Piper
 * Genera archivos de audio optimizados para reproducción instantánea
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
const SPEED = 3.5; // Velocidad rápida para carreras

// Todos los mensajes de las reglas
const MESSAGES = {
    'throttle-punch': 'Entrada de potencia muy brusca, aplicá el acelerador más gradual',
    'pedal-fidgeting': 'Demasiado movimiento en los pedales, suavizá las transiciones',
    'brake-riding': 'Estás pisando freno y acelerador al mismo tiempo, es ineficiente',
    'soft-braking': 'Frenadas muy suaves, metele más presión inicial',
    'brake-stomp': 'Frenadas muy bruscas, graduar mejor la presión del pedal',
    'lazy-throttle': 'Estás demorando mucho en acelerar después del apex, dale antes',
    'coasting-too-much': 'Estás yendo mucho en vacío, perdés tiempo sin acelerar ni frenar',
    'throttle-overlap': 'Levantás mucho el acelerador en los cambios, perdés potencia',
    'unfinished-braking': 'Te falta trail braking, soltá el freno gradual mientras girás',
    'brake-inconsistency': 'Frenadas inconsistentes, buscá puntos de referencia fijos',
    'redline-hanging': 'Estás colgado del limitador, cambiá antes para mantener potencia',
    'early-short-shift': 'Cambios muy prematuros, aprovechá más el rango de RPM',
    'engine-braking-risk': 'Mucho freno motor, cuidado con romper el cambio',
    'neutral-driving': 'Estás en punto muerto andando, enganchá una marcha',
    'slow-shifts': 'Cambios muy lentos, practicá la velocidad de palanca',
    'wrong-gear-slow-corner': 'Marcha muy larga para curva lenta, bajá una más',
    'no-rev-match': 'No estás haciendo punta-tacón, igualá las RPM en la bajada',
    'engine-warnings-detected': '¡Warning del motor detectado! Revisá la telemetría',
    'tyres-too-cold': 'Gomas muy frías (menos de 65°C), hacé serpentinas',
    'tyres-overheating': 'Neumáticos sobrecalentados (más de 100°C), reducí agresividad',
    'thermal-imbalance-lr': 'Desbalance térmico izquierda/derecha en gomas, revisá setup',
    'thermal-imbalance-fb': 'Desbalance térmico delantero/trasero, ajustá balance aerodinámico',
    'brake-fade': 'Frenos a más de 400°C, peligro de fatiga por calor',
    'cold-engine-stress': 'Motor frío con mucha exigencia, cuidado que el aceite está frío',
    'water-overheating': 'Temperatura de agua crítica (más de 105°C), levantá que se recalienta',
    'top-speed-inconsistency': 'Velocidad de punta inconsistente, mantené el gas a fondo en recta',
    'erratic-speed-variation': 'Variaciones erráticas de velocidad en recta, suavizá',
    'inefficient-fuel-consumption': 'Consumo de combustible ineficiente, levantá antes de frenar',
    'fuel-critical-low': '¡Menos de 5 litros de nafta! Entrá a boxes o gestioná',
    'stalling-risk': '¡Riesgo de calado! RPM muy bajas, bajá de marcha o acelerá'
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
    console.log('🎬 PRE-RENDERIZANDO MENSAJES DE REGLAS CON PIPER\n');
    console.log('='.repeat(70));
    console.log(`📝 Total de mensajes: ${Object.keys(MESSAGES).length}`);
    console.log(`🎤 Voz: Daniela (es_AR)`);
    console.log(`⚡ Velocidad: ${SPEED}x`);
    console.log('='.repeat(70));

    // Crear directorio de salida
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`\n📁 Directorio de salida: ${OUTPUT_DIR}\n`);

    const results = [];
    const startTime = Date.now();

    for (const [ruleId, text] of Object.entries(MESSAGES)) {
        try {
            const result = await renderAudio(ruleId, text);
            results.push(result);
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    const totalTime = Date.now() - startTime;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + '='.repeat(70));
    console.log('✅ RENDERIZADO COMPLETADO');
    console.log('='.repeat(70));
    console.log(`📊 Archivos generados: ${results.length}/${Object.keys(MESSAGES).length}`);
    console.log(`⏱️  Tiempo total de síntesis: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`🎵 Duración total de audio: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`📁 Ubicación: ${OUTPUT_DIR}`);
    console.log('='.repeat(70));
}

main().catch(err => {
    console.error('\n❌ ERROR:', err);
    process.exit(1);
});
