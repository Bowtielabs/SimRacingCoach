import { ActcAdapter } from '../../../packages/adapters/actc/dist/index.js';

const sim = 'actc';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function log(message) {
    console.error(`[ACTC] ${message}`);
}

log('Starting ACTC adapter...');
emit({ type: 'status', state: 'waiting', sim, details: 'Waiting for connection...' });

const adapter = new ActcAdapter(9302);

let connected = false;

adapter.start((frame) => {
    if (!connected) {
        connected = true;
        emit({ type: 'status', state: 'connected', sim, details: 'Connected to Simulador Turismo Carretera' });
        log('First frame received - Connected!');
    }
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
