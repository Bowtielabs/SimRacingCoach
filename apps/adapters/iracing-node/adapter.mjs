// iRacing adapter using irsdk-node v4 API
import { IRacingSDK } from 'irsdk-node';

const sim = 'iracing';
const TIMEOUT = 50; // 20fps = 50ms (optimized for voice coaching, was 16ms/60fps)

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
                log('✓ Connected to iRacing SDK and receiving data');
            }

            // Get telemetry data
            const telemetry = sdk.getTelemetry();
            if (!telemetry || Object.keys(telemetry).length === 0) {
                if (Math.random() < 0.05) log('Warning: Received empty telemetry object');
                continue;
            }

            const now = Date.now();

            // Helper to extract value from irsdk-node v4 format
            const getValue = (field) => field?.value?.[0] ?? null;

            // Map iRacing telemetry to NormalizedFrame (comprehensive capture)
            const data = {
                // ... (rest of the mapping is same)
                // Basic powertrain
                speed_mps: getValue(telemetry.Speed) || 0,
                rpm: getValue(telemetry.RPM),
                gear: getValue(telemetry.Gear),
                throttle_pct: (getValue(telemetry.Throttle) || 0) * 100,
                brake_pct: (getValue(telemetry.Brake) || 0) * 100,
                clutch_pct: (getValue(telemetry.Clutch) || 0) * 100,
                steering_rad: getValue(telemetry.SteeringWheelAngle),

                // Position & Lap data
                position: getValue(telemetry.PlayerCarPosition),
                class_position: getValue(telemetry.PlayerCarClassPosition),
                lap: getValue(telemetry.Lap),
                laps_completed: getValue(telemetry.LapCompleted),
                lap_dist_pct: getValue(telemetry.LapDistPct),

                // Session data
                session_time: getValue(telemetry.SessionTime),
                session_laps_remain: getValue(telemetry.SessionLapsRemain),
                session_time_remain: getValue(telemetry.SessionTimeRemain),
                session_num: getValue(telemetry.SessionNum),
                session_state: getValue(telemetry.SessionState),
                session_flags_raw: getValue(telemetry.SessionFlags),

                // Traffic
                traffic: getValue(telemetry.CarLeftRight),

                // Temperatures
                temps: {
                    water_c: getValue(telemetry.WaterTemp),
                    oil_c: getValue(telemetry.OilTemp),
                    track_c: getValue(telemetry.TrackTemp),
                    air_c: getValue(telemetry.AirTemp),
                    // Tyres (Average of Left/Center/Right for each wheel)
                    tyre_c: [
                        (getValue(telemetry.LFtempCL) + getValue(telemetry.LFtempCM) + getValue(telemetry.LFtempCR)) / 3,
                        (getValue(telemetry.RFtempCL) + getValue(telemetry.RFtempCM) + getValue(telemetry.RFtempCR)) / 3,
                        (getValue(telemetry.LRtempCL) + getValue(telemetry.LRtempCM) + getValue(telemetry.LRtempCR)) / 3,
                        (getValue(telemetry.RRtempCL) + getValue(telemetry.RRtempCM) + getValue(telemetry.RRtempCR)) / 3
                    ],
                    // Brakes (if available)
                    brake_c: [
                        getValue(telemetry.LFbrakeTemp),
                        getValue(telemetry.RFbrakeTemp),
                        getValue(telemetry.LRbrakeTemp),
                        getValue(telemetry.RRbrakeTemp)
                    ]
                },

                // Fuel
                fuel_level: getValue(telemetry.FuelLevel),
                fuel_level_pct: getValue(telemetry.FuelLevelPct),
                fuel_use_per_hour: getValue(telemetry.FuelUsePerHour),

                // Pit & Garage state
                on_pit_road: getValue(telemetry.OnPitRoad),
                in_garage: getValue(telemetry.PlayerCarInGarage),
                pit_sv_flags: getValue(telemetry.PitSvFlags),

                // Incidents & Damage
                incidents: getValue(telemetry.PlayerCarMyIncidents),

                // Lap times
                lap_times: {
                    best: getValue(telemetry.LapBestLapTime),
                    last: getValue(telemetry.LapLastLapTime),
                    current: getValue(telemetry.LapCurrentLapTime)
                },

                // Engine warnings
                engine_warnings: getValue(telemetry.EngineWarnings),

                // System
                tickCount: getValue(telemetry.SessionTick),
                is_on_track: getValue(telemetry.IsOnTrack),
                is_replay_playing: getValue(telemetry.IsReplayPlaying)
            };

            // Debug logging for SessionFlags (remove after debugging)
            if (data.session_flags_raw !== null && data.session_flags_raw !== 0) {
                log(`SessionFlags detected: ${data.session_flags_raw} (0x${data.session_flags_raw.toString(16).toUpperCase()})`);
            }

            // DEBUG: Confirm we're emitting frames
            if (data.speed_mps !== null && data.speed_mps !== undefined) {
                log(`EMITTING FRAME - Speed: ${data.speed_mps} m/s`);
            }

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
