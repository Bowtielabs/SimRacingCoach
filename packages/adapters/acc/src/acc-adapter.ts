import dgram from 'dgram';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { TelemetryFrame } from '@simracing/core';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        // Path to python script: ../python/acc_bridge.py relative to dist/index.js (so ../../python in src terms? No)
        // In src: ../python/acc_bridge.py
        // In dist: ../python/acc_bridge.py (if we copy it)
        // Let's assume we run from root or handle path carefully.
        // For dev: packages/adapters/acc/python/acc_bridge.py
        // We will try a known path relative to cwd or this file.
        const scriptPath = path.resolve(__dirname, '../../python/acc_bridge.py');
        console.log('[ACC-Adapter] Spawning bridge:', scriptPath);

        this.pythonProcess = spawn('python', [scriptPath], { stdio: 'inherit' });

        this.pythonProcess.on('error', (err) => {
            console.error('[ACC-Adapter] Failed to spawn python bridge:', err);
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
                tyreC: raw.physics.tyreCoreTemp // [FL, FR, RL, RR]
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
