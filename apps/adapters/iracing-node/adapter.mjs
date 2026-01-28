// iRacing adapter using irsdk-node v4 API
import { IRacingSDK } from 'irsdk-node';

const sim = 'iracing';
const TIMEOUT = Math.floor((1 / 60) * 1000); // 60fps = ~16ms

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function log(message) {
    console.error(`[iRacing] ${message}`);
}

log('Starting iRacing adapter...');

let connected = false;
let running = true;

// Main loop function
async function loop(sdk) {
    while (running) {
        try {
            // Wait for new data with timeout
            const hasNewData = await sdk.waitForData(TIMEOUT);

            if (!hasNewData) {
                // No new data, check if still connected
                const stillRunning = await IRacingSDK.IsSimRunning();
                if (!stillRunning && connected) {
                    connected = false;
                    emit({ type: 'status', state: 'disconnected', sim, details: 'iRacing closed' });
                    log('Lost connection - iRacing closed');
                }
                continue;
            }

            // We have new data - mark as connected if not already
            if (!connected) {
                connected = true;
                emit({ type: 'status', state: 'connected', sim, details: 'Connected' });
                log('Connected to iRacing');
            }

            // Get telemetry data
            const telemetry = sdk.getTelemetry();
            const now = Date.now();

            // Helper to extract value from irsdk-node v4 format
            const getValue = (field) => field?.value?.[0] ?? null;

            // Map iRacing telemetry to NormalizedFrame
            const data = {
                speed_mps: getValue(telemetry.Speed) || 0,
                rpm: getValue(telemetry.RPM),
                gear: getValue(telemetry.Gear),
                throttle_pct: (getValue(telemetry.Throttle) || 0) * 100,
                brake_pct: (getValue(telemetry.Brake) || 0) * 100,
                steering_rad: getValue(telemetry.SteeringWheelAngle),
                lap: getValue(telemetry.Lap),
                session_flags_raw: getValue(telemetry.SessionFlags),
                traffic: getValue(telemetry.CarLeftRight),
                temps: {
                    water_c: getValue(telemetry.WaterTemp),
                    oil_c: getValue(telemetry.OilTemp)
                },
                fuel_level: getValue(telemetry.FuelLevel),
                on_pit_road: getValue(telemetry.OnPitRoad),
                incidents: getValue(telemetry.PlayerCarMyIncidents),
                lap_times: {
                    best: getValue(telemetry.LapBestLapTime),
                    last: getValue(telemetry.LapLastLapTime)
                },
                engine_warnings: getValue(telemetry.EngineWarnings),
                tickCount: getValue(telemetry.SessionTick)
            };

            emit({ type: 'frame', sim, ts: now, data });
        } catch (error) {
            if (connected) {
                connected = false;
                emit({ type: 'status', state: 'disconnected', sim, details: 'Error reading telemetry' });
                log(`Error: ${error.message}`);
            }
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Main async initialization
async function main() {
    emit({ type: 'status', state: 'waiting', sim, details: 'Waiting for iRacing...' });
    log('Checking if iRacing is running...');

    // Poll until iRacing is running
    while (running) {
        try {
            const isRunning = await IRacingSDK.IsSimRunning();

            if (isRunning) {
                log('iRacing detected, initializing SDK...');
                const sdk = new IRacingSDK();

                // Wait for SDK to be ready
                const ready = await sdk.ready();
                if (ready) {
                    log('SDK ready, enabling auto-telemetry...');
                    sdk.autoEnableTelemetry = true;

                    // Start the polling loop
                    await loop(sdk);
                } else {
                    log('SDK failed to initialize, retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } else {
                // Not running yet, wait and retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            log(`Initialization error: ${error.message}`);
            emit({ type: 'status', state: 'error', sim, details: error.message });
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Cleanup on exit
process.on('SIGTERM', () => {
    log('Shutting down...');
    running = false;
    process.exit(0);
});

process.on('SIGINT', () => {
    log('Interrupted, shutting down...');
    running = false;
    process.exit(0);
});

// Start the adapter
main().catch(error => {
    log(`Fatal error: ${error.message}`);
    emit({ type: 'status', state: 'error', sim, details: error.message });
    process.exit(1);
});
