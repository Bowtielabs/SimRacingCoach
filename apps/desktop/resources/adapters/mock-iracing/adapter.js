const sim = 'iracing';
const details = 'Simulated iRacing Session';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

emit({ type: 'status', state: 'connected', sim, details });

let tick = 0;
let lap = 1;
let incidents = 0;
let bestLap = 90.5;

setInterval(() => {
    tick++;
    const t = Date.now();

    // Base frame
    const data = {
        t,
        speed_mps: 50 + Math.sin(tick * 0.1) * 20,
        rpm: 6000 + Math.sin(tick * 0.1) * 1000,
        gear: 3,
        lap,
        session_flags_raw: 0,
        traffic: 0,
        temps: {
            water_c: 90,
            oil_c: 95
        },
        fuel_level: 40,
        on_pit_road: false,
        incidents,
        lap_times: {
            best: bestLap,
            last: 0
        },
        engine_warnings: 0,
        tickCount: tick
    };

    // Logic Cycle (approx 10 ticks per second)
    const cycleTick = tick % 300; // 30 second cycle

    if (cycleTick < 50) {
        // Phase 1: Pit Road (0-5s)
        data.on_pit_road = true;
        data.speed_mps = 16;
    } else if (cycleTick === 50) {
        lap++;
    } else if (cycleTick > 80 && cycleTick < 120) {
        // Phase 2: Traffic Left (8-12s)
        data.traffic = 1; // Left
    } else if (cycleTick === 121) {
        data.traffic = 0; // Clear
    } else if (cycleTick > 150 && cycleTick < 200) {
        // Phase 3: High Temps (15-20s)
        data.temps.oil_c = 115;
    } else if (cycleTick > 220 && cycleTick < 250) {
        // Phase 4: Engine Damage (22-25s)
        data.engine_warnings = 0x10;
    } else if (cycleTick === 280) {
        // Phase 5: New Record
        bestLap -= 0.5;
        data.lap_times.best = bestLap;
    }

    emit({ type: 'frame', sim, ts: t, data });

    // Random flags occasionally
    if (tick % 500 === 0) {
        emit({ type: 'status', state: 'connected', sim, details: 'Yellow Flag Active' });
        emit({ type: 'frame', sim, ts: t, data: { ...data, session_flags_raw: 0x4000 } }); // Simplified flag
    }

}, 100);
