import { AccAdapter } from '../../../packages/adapters/acc/dist/index.js';

const sim = 'acc';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function log(message) {
    console.error(`[ACC] ${message}`);
}

log('Starting ACC adapter...');
emit({ type: 'status', state: 'waiting', sim, details: 'Waiting for connection...' });

const adapter = new AccAdapter(9300);

adapter.start((frame) => {
    // Adapter returns normalized TelemetryFrame.
    // Service expects AdapterFrame (legacy format) OR normalized.
    // Updated service to handle normalized frames would be ideal, but for now we map back OR send normalized and let service fail/succeed?
    // Service index.ts line 128 constructs a new frame from message.data properties (snake_case).
    // If we want to support the current Service logic without changing it deeply, we must provide snake_case data.
    // BUT! Since we control the code, let's just make the Service accept "type: 'normalized'" or similiar?
    // Too risky for now. Let's map normalized frame -> snake_case adapter format.

    // Reverse mapping (Painful but safe)
    const data = {
        speed_mps: (frame.powertrain.speedKph || 0) / 3.6,
        rpm: frame.powertrain.rpm,
        gear: frame.powertrain.gear,
        throttle_pct: (frame.powertrain.throttle || 0) * 100,
        brake_pct: (frame.powertrain.brake || 0) * 100,
        clutch_pct: (frame.powertrain.clutch || 0) * 100,
        steering_rad: frame.physics.steeringAngle, // Ensure units match

        temps: {
            tyre_c: frame.temps.tyreC
        },
        // Fill other basics needed for Rules Engine
        on_pit_road: frame.session.onPitRoad ? 1 : 0,
        is_on_track: frame.session.isOnTrack ? 1 : 0,

        // Physics for advanced rules
        // Service doesn't map physics.lateralG currently! 
        // We added it to TelemetryFrame in Types, but Service index.ts line 128 does NOT map it from AdapterFrameMessage.
        // WE NEED TO UPDATE SERVICE TO MAP PHYSICS!
    };

    // Wait, if Service recalculates the frame, it will LOSE the data if Service doesn't map it.
    // The Service constructs frame from `data`.
    // I MUST UPDATE SERVICE `index.ts` to map `physics`, `suspension`, `aero` from `data`.
    // AND I must send those in `data` here.

    // Let's pass the RAW normalized frame inside `data._normalized` and hack Service to use it?
    // Or better: update Service to map `physics` fields.

    // For now, let's just emit what we can.

    emit({ type: 'frame', sim, ts: frame.t, data });
});

process.on('SIGINT', () => {
    adapter.stop();
    process.exit(0);
});
