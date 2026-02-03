// Generate all WAV files using Google Cloud TTS
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Creates a client
const client = new textToSpeech.TextToSpeechClient();

const rules = {
    'greeting-1': '¡Dale dale! Te voy a estar mirando y te ayudo a mejorar.',
    'greeting-2': '¡Vamos vamos! Estoy acá con vos, te voy dando consejos.',
    'greeting-3': '¡Arrancamos! Concentrate en la pista que yo te voy guiando.',
    'greeting-4': '¡Dale que podés! Vamos por ese tiempazo, estoy con vos.',
    'coach-connected': 'Entrenador virtual conectado',
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

const outputDir = path.join(__dirname, 'core/ai_engines/piper/prerendered');

async function generateAudio(ruleId, text, index, total) {
    const request = {
        input: { text: text },
        voice: {
            languageCode: 'es-US', // Spanish (Latin America) - closest to Argentina
            name: 'es-US-Neural2-B', // Male voice
            ssmlGender: 'MALE'
        },
        audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 44100,
            speakingRate: 1.0,
            pitch: 0.0
        }
    };

    console.log(`[${index}/${total}] Generating ${ruleId}.wav...`);

    try {
        const [response] = await client.synthesizeSpeech(request);
        const outputPath = path.join(outputDir, `${ruleId}.wav`);
        await fs.promises.writeFile(outputPath, response.audioContent, 'binary');
        console.log(`  ✓ ${ruleId}.wav (44100Hz)`);
    } catch (error) {
        console.error(`  ✗ Error generating ${ruleId}:`, error.message);
    }
}

async function main() {
    console.log('\n🔊 Generando 35 archivos WAV con Google Cloud TTS\n');
    console.log('Voz: es-US-Neural2-B (Male, Latin American Spanish)');
    console.log('Sample Rate: 44100 Hz\n');

    const entries = Object.entries(rules);
    const total = entries.length;

    for (let i = 0; i < total; i++) {
        const [ruleId, text] = entries[i];
        await generateAudio(ruleId, text, i + 1, total);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Generación completa!\n');

    // Beep sequence
    console.log('\x07'); // System beep
}

main().catch(console.error);
