import dgram from 'dgram';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { TelemetryFrame } from '@simracing/core';
import { fileURLToPath } from 'url';

const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export class Ams2Adapter {
    private socket: dgram.Socket;
    private lastFrame: TelemetryFrame | null = null;
    private port: number;
    private pythonProcess: ChildProcess | null = null;

    constructor(port: number = 9301) { // Default AMS2 bridge port
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
                console.error('[AMS2-Adapter] Error parsing UDP:', e);
            }
        });

        this.socket.bind(this.port, () => {
            console.log(`[AMS2-Adapter] Listening on UDP ${this.port}`);
            this.spawnBridge();
        });
    }

    private spawnBridge() {
        const fs = require('fs');
        const exeName = 'ams2_bridge.exe';

        const possiblePaths = [
            path.join(process.cwd(), 'resources/bin', exeName),
            path.join(process.cwd(), 'apps/desktop/resources/bin', exeName),
            path.join(path.dirname(process.execPath), 'resources/bin', exeName)
        ];

        let executable: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                executable = p;
                break;
            }
        }

        if (executable) {
            console.log('[AMS2-Adapter] Spawning binary:', executable);
            this.pythonProcess = spawn(executable, [], { stdio: 'inherit' });
        } else {
            const scriptPath = path.resolve(_dirname, '../../python/ams2_bridge.py');
            console.log('[AMS2-Adapter] Spawning python script:', scriptPath);
            this.pythonProcess = spawn('python', [scriptPath], { stdio: 'inherit' });
        }

        this.pythonProcess?.on('error', (err) => {
            console.error('[AMS2-Adapter] Failed to spawn bridge:', err);
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
        if (!raw.physics) return null; // No graphcis in AMS2 shared memory sometimes?

        return {
            t: Date.now(),
            sim: 'automobilista2',
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
                steeringAngle: raw.physics.steerAngle,
                lateralG: raw.physics.accG?.[0] || 0,
                longitudinalG: raw.physics.accG?.[2] || 0
            },
            temps: {
                tyreC: raw.physics.tyreTemp, // [FL, FR, RL, RR]
                brakeC: [] // Not yet mapped
            },
            suspension: {
                shockDeflection: raw.physics.suspensionTravel
            },
            traffic: {
                carLeftRight: 0 // Placeholder
            },
            flags: {
                sessionFlags: 0 // Placeholder
            }
        };
    }
}
