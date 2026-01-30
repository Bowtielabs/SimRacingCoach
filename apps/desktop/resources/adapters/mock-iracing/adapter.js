/**
 * Mock iRacing Adapter MEJORADO
 * Genera telemetría que dispara diferentes reglas para testing
 */

const sim = 'iracing';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

emit({ type: 'status', state: 'waiting', sim, details: 'Mock iRacing starting...' });

setTimeout(() => {
    emit({ type: 'status', state: 'connected', sim, details: 'Connected (Mock)' });
    console.error('[Mock iRacing] 🏎️ Mock adapter connected - generating varied telemetry');
    startTelemetry();
}, 500);

function startTelemetry() {
    let tick = 0;
    let lap = 1;
    let lapStartTime = Date.now();
    let bestLapTime = 125000;
    let lastLapTime = 0;
    let trackPosition = 0;
    let currentScenario = 'normal';

    // Ciclo de escenarios para probar diferentes reglas
    // Cada escenario dura ~15 segundos (150 ticks)
    const scenarios = [
        'normal',           // 0-15s: Manejo normal (activa heartbeat)
        'high_rpm',         // 15-30s: RPM muy alto (>7800)
        'oil_hot',          // 30-45s: Aceite caliente (>110°C)
        'brakes_hot',       // 45-60s: Frenos calientes (>350°C)
        'tyres_cold',       // 60-75s: Neumáticos fríos (<60°C)
        'aggressive_throttle', // 75-90s: Acelerador agresivo
        'hard_braking',     // 90-105s: Frenadas fuertes
        'traffic_close',    // 105-120s: Tráfico cerca
    ];

    setInterval(() => {
        tick++;
        const t = Date.now();
        const elapsedLapMs = t - lapStartTime;

        trackPosition = (trackPosition + 0.0001) % 1;

        // Cambiar escenario cada 150 ticks (~15 segundos)
        const scenarioIndex = Math.floor(tick / 150) % scenarios.length;
        currentScenario = scenarios[scenarioIndex];

        // Base values
        let speedKph = 100 + Math.sin(tick * 0.05) * 30 + Math.random() * 10;
        let rpm = 5500 + Math.random() * 500;
        let throttle = 0.7 + Math.random() * 0.3;
        let brake = 0;
        let waterC = 88;
        let oilC = 95;
        let tyreTemps = [85, 87, 83, 85]; // FL, FR, RL, RR
        let brakeTemps = [200, 210, 180, 190];
        let carLeftRight = 0;
        let gear = 4;

        // Modificar según el escenario actual
        switch (currentScenario) {
            case 'high_rpm':
                // RPM muy alto para activar "cambiar marcha YA"
                rpm = 7900 + Math.random() * 300;
                speedKph = 180 + Math.random() * 20;
                gear = 5;
                break;

            case 'oil_hot':
                // Aceite caliente (>110°C)
                oilC = 112 + Math.random() * 5;
                waterC = 105;
                rpm = 7000;
                break;

            case 'brakes_hot':
                // Frenos calientes (>350°C)
                brakeTemps = [360 + Math.random() * 30, 370 + Math.random() * 30, 340, 345];
                brake = 0.8;
                speedKph = 60;
                break;

            case 'tyres_cold':
                // Neumáticos fríos (<60°C)
                tyreTemps = [45 + Math.random() * 10, 48 + Math.random() * 10, 42, 44];
                speedKph = 80;
                break;

            case 'aggressive_throttle':
                // Muchos cambios de acelerador
                throttle = Math.random() > 0.5 ? 1.0 : 0.2;
                speedKph = 120;
                break;

            case 'hard_braking':
                // Frenadas fuertes
                if (tick % 20 < 10) {
                    brake = 0.95;
                    throttle = 0;
                    speedKph = 80;
                } else {
                    brake = 0;
                    throttle = 1.0;
                    speedKph = 150;
                }
                break;

            case 'traffic_close':
                // Tráfico muy cerca
                carLeftRight = 0.2; // Muy cerca
                speedKph = 160;
                break;
        }

        const speedMps = speedKph / 3.6;
        if (speedKph > 100) gear = Math.min(6, Math.floor(speedKph / 35) + 1);

        // Nueva vuelta cada 120 segundos
        if (trackPosition < 0.001 && tick > 100 && tick % 1200 < 10) {
            lap++;
            lastLapTime = elapsedLapMs;
            if (lastLapTime < bestLapTime && lastLapTime > 60000) {
                bestLapTime = lastLapTime;
            }
            lapStartTime = t;
            console.error(`[Mock iRacing] 🏁 Lap ${lap} started`);
        }

        const data = {
            speed_mps: speedMps,
            rpm,
            gear,
            throttle_pct: throttle * 100,
            brake_pct: brake * 100,
            clutch_pct: 0,
            lap,
            lap_dist_pct: trackPosition,
            lap_current_time: elapsedLapMs,
            lap_best_time: bestLapTime / 1000,
            lap_last_time: lastLapTime / 1000,
            // Temperaturas en el formato que espera el adaptador
            water_temp_c: waterC,
            oil_temp_c: oilC,
            tyre_temp_lf: tyreTemps[0],
            tyre_temp_rf: tyreTemps[1],
            tyre_temp_lr: tyreTemps[2],
            tyre_temp_rr: tyreTemps[3],
            brake_temp_lf: brakeTemps[0],
            brake_temp_rf: brakeTemps[1],
            brake_temp_lr: brakeTemps[2],
            brake_temp_rr: brakeTemps[3],
            fuel_level: 40 - (lap * 2),
            fuel_pct: Math.max(0.1, 1 - lap * 0.05),
            session_flags_raw: 0x10040000,
            on_pit_road: false,
            is_on_track: true,
            steering_rad: Math.sin(tick * 0.1) * 0.3,
            lat_g: Math.sin(trackPosition * Math.PI * 8) * 1.5,
            long_g: brake > 0 ? -2.5 : throttle * 0.5,
            car_left_right: carLeftRight,
            tickCount: tick
        };

        emit({ type: 'frame', sim, ts: t, data });

        // Log de progreso cada 5 segundos
        if (tick % 50 === 0) {
            console.error(`[Mock iRacing] 📊 Tick ${tick} - Scenario: ${currentScenario.toUpperCase()}, Speed: ${speedKph.toFixed(0)} kph, RPM: ${rpm.toFixed(0)}`);
        }

    }, 100);
}

process.on('SIGTERM', () => {
    emit({ type: 'status', state: 'disconnected', sim, details: 'Mock stopped' });
    process.exit(0);
});

process.on('SIGINT', () => {
    emit({ type: 'status', state: 'disconnected', sim, details: 'Mock stopped' });
    process.exit(0);
});
