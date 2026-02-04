import dgram from 'dgram';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { TelemetryFrame } from '@simracing/core';
import { fileURLToPath } from 'url';

// Safe dirname for ESM/CJS dual support
const _dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export class AccAdapter {
    private socket: dgram.Socket;
    private lastFrame: TelemetryFrame | null = null;
    private port: number;
    private pythonProcess: ChildProcess | null = null;

    constructor(port: number = 9300) {
        this.port = port;
        this.socket = dgram.createSocket('udp4');
    }

    public start(onData: (data: TelemetryFrame) => void) {
        // 1. Start UDP Listener
        this.socket.on('message', (msg) => {
            try {
                // Expecting JSON from Python Bridge
                const raw = JSON.parse(msg.toString());
                const frame = this.mapToTelemetryFrame(raw);
                if (frame) {
                    this.lastFrame = frame;
                    onData(frame);
                }
            } catch (e) {
                console.error('[ACC-Adapter] Error parsing UDP:', e);
            }
        });

        this.socket.bind(this.port, () => {
            console.log(`[ACC-Adapter] Listening on UDP ${this.port}`);
            this.spawnBridge();
        });
    }

    private spawnBridge() {
        const fs = require('fs');
        const exeName = 'acc_bridge.exe';

        // Potential paths for the binary
        // 1. Production (Electron resources)
        // 2. Development (CWD/apps/desktop/resources/bin)
        const possiblePaths = [
            path.join(process.cwd(), 'resources/bin', exeName),
            path.join(process.cwd(), 'apps/desktop/resources/bin', exeName),
            path.join(path.dirname(process.execPath), 'resources/bin', exeName) // Standard Electron install
        ];

        let executable: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                executable = p;
                break;
            }
        }

        if (executable) {
            console.log('[ACC-Adapter] Spawning binary:', executable);
            this.pythonProcess = spawn(executable, [], { stdio: 'inherit' });
        } else {
            const scriptPath = path.resolve(_dirname, '../../python/acc_bridge.py');
            console.log('[ACC-Adapter] Spawning python script:', scriptPath);
            this.pythonProcess = spawn('python', [scriptPath], { stdio: 'inherit' });
        }

        this.pythonProcess?.on('error', (err) => {
            console.error('[ACC-Adapter] Failed to spawn bridge:', err);
        });
    }

    public stop() {
        this.socket.close();
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
    }

    private mapToTelemetryFrame(raw: any): TelemetryFrame | null {
        // Mapping Logic (Python Bridge sends simplified structure)
        if (!raw.physics || !raw.graphics) return null;

        return {
            t: Date.now(),
            sim: 'assetto_corsa', // or 'acc'
            player: {
                carIdx: 0,
            },
            powertrain: {
                speedKph: raw.physics.speedKph,
                rpm: raw.physics.rpm,
                gear: raw.physics.gear,
                throttle: raw.physics.gas,
                brake: raw.physics.brake,
                clutch: raw.physics.clutch
            },
            physics: {
                steeringAngle: raw.physics.steerAngle, // normalized or degrees? Python should normalize
                lateralG: raw.physics.camberRAD?.[0] || 0, // Placeholder
                longitudinalG: raw.physics.accG?.[2] || 0
            },
            temps: {
                tyreC: raw.physics.tyreTemp, // [FL, FR, RL, RR]
                brakeC: [] // Not available in Shared Memory v1
            },
            suspension: {
                shockDeflection: raw.physics.suspensionTravel // [FL, FR, RL, RR]
            },
            traffic: {
                carLeftRight: 0 // Placeholder
            },
            flags: {
                sessionFlags: 0 // Placeholder
            }
            // Add mapping as Python bridge evolves
        };
    }
}
