/**
 * Mock iRacing Adapter - TELEMETRÍA REAL CAPTURADA
 * Reproduce frames reales de iRacing capturados previamente
 */

const fs = require('fs');
const path = require('path');

const sim = 'iracing';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

emit({ type: 'status', state: 'waiting', sim, details: 'Mock starting...' });

// Cargar telemetría real capturada
const telemetryFile = path.join(__dirname, 'real-telemetry.json');
let realFrames = [];

try {
    const data = JSON.parse(fs.readFileSync(telemetryFile, 'utf8'));
    realFrames = data.frames || [];
    console.error(`[Mock] ✅ Loaded ${realFrames.length} real frames from iRacing capture`);
} catch (error) {
    console.error(`[Mock] ❌ Error loading real telemetry: ${error.message}`);
    console.error('[Mock] Falling back to synthetic data...');
}

setTimeout(() => {
    emit({ type: 'status', state: 'connected', sim, details: 'Connected (Mock - Real Data)' });
    console.error('[Mock] 🏎️ REPRODUCIENDO TELEMETRÍA REAL DE IRACING');
    startTelemetry();
}, 500);

function startTelemetry() {
    let frameIndex = 0;

    // Si no hay frames reales, usar datos sintéticos básicos
    if (realFrames.length === 0) {
        console.error('[Mock] ⚠️ No real frames available, using basic synthetic data');
        setInterval(() => {
            const t = Date.now();
            const data = {
                speed_mps: 50 / 3.6,
                rpm: 5000,
                gear: 3,
                throttle_pct: 80,
                brake_pct: 0,
                lap: 1,
                temps: {
                    water_c: 80,
                    oil_c: 90,
                    tyre_c: [60, 60, 60, 60],
                    brake_c: []
                }
            };
            emit({ type: 'frame', sim, ts: t, data });
        }, 100);
        return;
    }

    // Reproducir frames reales en loop CON CONDICIONES EXTREMAS INYECTADAS
    setInterval(() => {
        const t = Date.now();
        const frame = realFrames[frameIndex];
        const cycle = frameIndex % 300; // Ciclo de 30 segundos

        // Mapear frame capturado al formato esperado
        const data = {
            // Powertrain - INYECTAR RPM EXTREMO en ciertas fases
            speed_mps: frame.powertrain?.speedKph ? frame.powertrain.speedKph / 3.6 : 0,
            rpm: cycle < 100 ? 8200 : (frame.powertrain?.rpm || 0), // ⚠️ RPM CRÍTICO en fase 1
            gear: frame.powertrain?.gear || 0,
            throttle_pct: (frame.powertrain?.throttle || 0) * 100,
            brake_pct: (frame.powertrain?.brake || 0) * 100,
            clutch_pct: (frame.powertrain?.clutch || 0) * 100,

            // Position & Lap
            position: frame.player?.position || 0,
            class_position: frame.player?.classPosition || 0,
            lap: frame.session?.lap || 0,
            laps_completed: frame.session?.lapsCompleted || 0,
            lap_dist_pct: 0.5,

            // Session
            session_time: frame.session?.sessionTime || 0,
            session_laps_remain: frame.session?.sessionLapsRemain || 0,
            session_time_remain: frame.session?.sessionTimeRemain || 0,
            // INYECTAR BANDERA AMARILLA SOLO UNA VEZ al inicio (frames 50-80)
            session_flags_raw: (cycle >= 50 && cycle < 80)
                ? 0x00000008 // ⚠️ YELLOW FLAG (una sola vez, luego desaparece)
                : (frame.flags?.sessionFlags || 0),

            // Traffic - INYECTAR TRÁFICO CERCANO en fase 3
            traffic: cycle >= 150 && cycle < 200 ? 0.2 : (frame.traffic?.carLeftRight || 0), // ⚠️ TRAFFIC CLOSE

            // Temperatures - INYECTAR TEMPERATURAS EXTREMAS
            temps: {
                water_c: cycle < 80 ? 115 : (frame.temps?.waterC || 0), // ⚠️ AGUA CALIENTE
                oil_c: cycle >= 80 && cycle < 160 ? 118 : (frame.temps?.oilC || 0), // ⚠️ ACEITE CALIENTE
                track_c: frame.temps?.trackC || 0,
                air_c: frame.temps?.airC || 0,
                tyre_c: cycle >= 200 && cycle < 250 ? [40, 42, 41, 40] : (frame.temps?.tyreC || [0, 0, 0, 0]), // ⚠️ GOMAS FRÍAS
                brake_c: frame.temps?.brakeC || [] // No disponible en iRacing
            },

            // Fuel - INYECTAR COMBUSTIBLE BAJO en fase 4
            fuel_level: cycle >= 250 ? 2.0 : (frame.fuel?.level || 0), // ⚠️ FUEL LOW
            fuel_level_pct: cycle >= 250 ? 0.08 : (frame.fuel?.levelPct || 0),
            fuel_use_per_hour: frame.fuel?.usePerHour || 0,

            // Pit & Garage - INYECTAR SALIDA DE PITS
            on_pit_road: (cycle >= 30 && cycle < 80), // ⚠️ EN PITS frames 30-80, luego SALE
            in_garage: false,
            is_on_track: !(cycle >= 30 && cycle < 80), // Fuera de pista cuando está en pits

            // Lap times
            lap_times: {
                best: 120,
                last: 125, // ⚠️ PERDIENDO TIEMPO (delta > 2s)
                current: frame.lapTimes?.current || 0
            },

            // Engine warnings
            engine_warnings: frame.engineWarnings || 0,

            tickCount: frameIndex
        };

        emit({ type: 'frame', sim, ts: t, data });

        // Loop cuando llegamos al final
        frameIndex = (frameIndex + 1) % realFrames.length;

        // Log de condiciones inyectadas
        if (frameIndex % 100 === 0) {
            const conditions = [];
            if (data.rpm > 8000) conditions.push('🔴 RPM CRÍTICO');
            if (data.temps.water_c > 110) conditions.push('🌡️ AGUA CALIENTE');
            if (data.temps.oil_c > 110) conditions.push('🌡️ ACEITE CALIENTE');
            if (data.session_flags_raw === 0x00000008) conditions.push('🚩 BANDERA AMARILLA');
            if (data.traffic < 0.3 && data.traffic > 0) conditions.push('🚗 TRÁFICO CERCANO');
            if (data.fuel_level_pct < 0.10) conditions.push('⛽ COMBUSTIBLE BAJO');
            if (data.on_pit_road) conditions.push('🏁 EN PITS');

            console.error(`[Mock] 📊 Frame ${frameIndex}/${realFrames.length} (cycle ${cycle}/300) | ${conditions.join(' | ') || 'Normal'}`);
        }

        // Log específico de salida de pits
        if (cycle === 80) {
            console.error('[Mock] 🏁🏁🏁 ¡SALIENDO DE PITS! (cycle 80) - Debería disparar mensaje motivador');
        }
    }, 100); // 10 fps para replay suave
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
