const irsdk = require('irsdk-node');

const sdk = new irsdk.IRacingSDK();
const sim = 'iracing';

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function log(message) {
    console.error(`[iRacing] ${message}`);
}

log('Starting native adapter...');

// Start the SDK
sdk.startSDK();

emit({ type: 'status', state: 'waiting', sim, details: 'Connecting to iRacing...' });

let connected = false;

// Poll loop (60Hz)
setInterval(() => {
    try {
        // Check if session is OK
        const isOk = sdk.sessionStatusOK();

        if (!isOk) {
            if (connected) {
                connected = false;
                emit({ type: 'status', state: 'disconnected', sim, details: 'Disconnected' });
                log('Lost connection');
            }
            return;
        }

        // Wait for new data
        const hasNewData = sdk.waitForData(16); // 16ms timeout

        if (!connected) {
            connected = true;
            emit({ type: 'status', state: 'connected', sim, details: 'Connected' });
            log('Connected to iRacing');
        }

        if (hasNewData) {
            const telemetry = sdk.getTelemetry();
            const now = Date.now();

            // Map iRacing telemetry to NormalizedFrame
            const data = {
                t: now,
                speed_mps: telemetry.Speed || 0,
                rpm: telemetry.RPM,
                gear: telemetry.Gear,
                throttle_pct: (telemetry.Throttle || 0) * 100,
                brake_pct: (telemetry.Brake || 0) * 100,
                steering_rad: telemetry.SteeringWheelAngle,
                steering_rad: telemetry.SteeringWheelAngle,
                session: {
                    lap: telemetry.Lap,
                    lapsCompleted: telemetry.LapCompleted || (telemetry.Lap > 0 ? telemetry.Lap - 1 : 0),
                    timeRemaining: telemetry.SessionTimeRemain,
                    lapsRemaining: telemetry.SessionLapsRemain
                },
                session_flags_raw: telemetry.SessionFlags,
                traffic: telemetry.CarLeftRight,
                temps: {
                    water_c: telemetry.WaterTemp,
                    oil_c: telemetry.OilTemp,
                    track_c: telemetry.TrackTempCrew
                },
                carControls: {
                    absActive: telemetry.BrakeABSActive,
                    tcActive: telemetry.TractionControlActive || (telemetry.dcTractionControl > 0)
                },
                fuel_level: telemetry.FuelLevel,
                on_pit_road: telemetry.OnPitRoad,
                incidents: telemetry.PlayerCarMyIncidents,
                lap_times: {
                    best: telemetry.LapBestLapTime,
                    last: telemetry.LapLastLapTime
                },
                engine_warnings: telemetry.EngineWarnings,
                tickCount: telemetry.SessionTick
            };

            emit({ type: 'frame', sim, ts: now, data });
        }
    } catch (error) {
        if (connected) {
            connected = false;
            emit({ type: 'status', state: 'disconnected', sim, details: 'Error reading telemetry' });
            log(`Error: ${error.message}`);
        }
    }
}, 16); // ~60fps

// Cleanup on exit
process.on('SIGTERM', () => {
    log('Shutting down...');
    sdk.stopSDK();
    process.exit(0);
});
