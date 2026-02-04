import { Ams2Adapter } from '../../../packages/adapters/ams2/dist/index.js';

const sim = 'ams2';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function log(message) {
    console.error(`[AMS2] ${message}`);
}

log('Starting AMS2 adapter...');
emit({ type: 'status', state: 'waiting', sim, details: 'Waiting for connection...' });

const adapter = new Ams2Adapter(9301);

adapter.start((frame) => {
    // Reverse mapping for Service (Legacy)
    const data = {
        speed_mps: (frame.powertrain?.speedKph || 0) / 3.6,
        rpm: frame.powertrain?.rpm,
        gear: frame.powertrain?.gear,
        throttle_pct: (frame.powertrain?.throttle || 0) * 100,
        brake_pct: (frame.powertrain?.brake || 0) * 100,
        clutch_pct: (frame.powertrain?.clutch || 0) * 100,
        steering_rad: frame.physics?.steeringAngle || 0,

        // Pass through complex objects for Service v2 logic
        physics: frame.physics,
        suspension: frame.suspension,

        // Basic flags
        on_pit_road: 0,
        is_on_track: 1
    };

    emit({ type: 'frame', sim, ts: frame.t, data });
});

process.on('SIGINT', () => {
    adapter.stop();
    process.exit(0);
});
