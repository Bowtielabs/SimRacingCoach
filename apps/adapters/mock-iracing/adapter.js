/**
 * Mock iRacing Adapter - TELEMETRÍA AGRESIVA
 * Genera situaciones extremas para probar todas las reglas
 */

const sim = 'iracing';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

emit({ type: 'status', state: 'waiting', sim, details: 'Mock starting...' });

setTimeout(() => {
    emit({ type: 'status', state: 'connected', sim, details: 'Connected (Mock)' });
    console.error('[Mock] 🏎️ TELEMETRÍA AGRESIVA ACTIVADA');
    startTelemetry();
}, 500);

function startTelemetry() {
    let tick = 0;
    let lap = 1;

    setInterval(() => {
        tick++;
        const t = Date.now();
        const phase = tick % 100; // Ciclo de 10 segundos

        // TELEMETRÍA EXTREMA - Múltiples condiciones simultáneas
        let speedKph = 160 + Math.sin(tick * 0.1) * 40; // 120-200 kph
        let rpm = 7500 + Math.random() * 1000; // Siempre alto 7500-8500
        let throttle = 90;
        let brake = 0;
        let waterC = 95;
        let oilC = 108; // Casi siempre caliente
        let tyreTemps = [75, 77, 73, 75]; // Normales
        let brakeTemps = [320, 330, 300, 310]; // Calientes
        let carLeftRight = 0;

        // Fases agresivas alternadas
        if (phase < 30) {
            // FASE 1: RPM extremo + aceite caliente
            rpm = 8100 + Math.random() * 400;
            oilC = 118;
            console.error(`[Mock] 🔴 RPM: ${rpm.toFixed(0)} | OIL: ${oilC}°C`);
        } else if (phase < 50) {
            // FASE 2: Frenos rojos + frenada fuerte
            brakeTemps = [420, 430, 380, 390];
            brake = 95;
            throttle = 0;
            speedKph = 50;
            console.error(`[Mock] 🔥 BRAKES: ${brakeTemps[0]}°C | BRAKE: ${brake}%`);
        } else if (phase < 70) {
            // FASE 3: Gomas frías + tráfico cerca
            tyreTemps = [42, 45, 40, 43];
            carLeftRight = 0.15;
            rpm = 6500;
            console.error(`[Mock] ❄️ TYRES: ${tyreTemps[0]}°C | TRAFFIC CLOSE`);
        } else {
            // FASE 4: Agua caliente + acelerador agresivo
            waterC = 115;
            throttle = Math.random() > 0.3 ? 100 : 0; // On/off agresivo
            rpm = 7900;
            console.error(`[Mock] � WATER: ${waterC}°C | THROTTLE: ${throttle}%`);
        }

        // Cambio de vuelta
        if (tick > 0 && tick % 600 === 0) {
            lap++;
            console.error(`[Mock] 🏁 LAP ${lap}`);
        }

        const data = {
            speed_mps: speedKph / 3.6,
            rpm,
            gear: Math.min(6, Math.floor(speedKph / 35) + 1),
            throttle_pct: throttle,
            brake_pct: brake,
            clutch_pct: 0,
            lap,
            lap_dist_pct: (tick % 600) / 600,
            temps: {
                water_c: waterC,
                oil_c: oilC,
                tyre_c: tyreTemps,
                brake_c: brakeTemps
            },
            fuel_level: 35,
            fuel_level_pct: 0.7,
            session_flags_raw: 0x10040000,
            on_pit_road: false,
            is_on_track: true,
            traffic: carLeftRight,
            lap_times: {
                best: 120,
                last: 122,
                current: 55
            },
            tickCount: tick
        };

        emit({ type: 'frame', sim, ts: t, data });

    }, 100);
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
