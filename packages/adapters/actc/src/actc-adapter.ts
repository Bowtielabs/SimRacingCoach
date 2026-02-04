import dgram from 'dgram';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { TelemetryFrame } from '@simracing/core';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ActcAdapter {
    private socket: dgram.Socket;
    private lastFrame: TelemetryFrame | null = null;
    private port: number;
    private pythonProcess: ChildProcess | null = null;

    constructor(port: number = 9302) {
        this.port = port;
        this.socket = dgram.createSocket('udp4');
    }

    public start(onData: (data: TelemetryFrame) => void) {
        this.socket.on('message', (msg) => {
            try {
                const raw = JSON.parse(msg.toString());
                const frame = this.mapToTelemetryFrame(raw);
                if (frame) {
                    this.lastFrame = frame;
                    onData(frame);
                }
            } catch (e) {
                console.error('[ACTC-Adapter] Error parsing UDP:', e);
            }
        });

        this.socket.bind(this.port, () => {
            console.log(`[ACTC-Adapter] Listening on UDP ${this.port}`);
            this.spawnBridge();
        });
    }

    private spawnBridge() {
        const scriptPath = path.resolve(__dirname, '../../python/actc_bridge.py');
        console.log('[ACTC-Adapter] Spawning bridge:', scriptPath);

        this.pythonProcess = spawn('python', [scriptPath], { stdio: 'inherit' });

        this.pythonProcess.on('error', (err) => {
            console.error('[ACTC-Adapter] Failed to spawn python bridge:', err);
        });
    }

    public stop() {
        this.socket.close();
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
    }

    private mapToTelemetryFrame(raw: any): TelemetryFrame | null {
        // rFactor 1 Telemetry Mapping
        return {
            t: raw.t || Date.now(),
            sim: 'actc', // Identified as 'actc' internally
            player: {
                carIdx: 0,
            },
            powertrain: {
                speedKph: raw.speed * 3.6, // Received in m/s
                rpm: raw.rpm,
                gear: raw.gear,
                throttle: raw.throttle, // 0-1
                brake: raw.brake, // 0-1 
                clutch: raw.clutch
            },
            physics: {
                steeringAngle: raw.steer,
                lateralG: raw.lateralG,
                longitudinalG: raw.longitudinalG
            },
            temps: {
                tyreC: raw.tyreTemp, // [FL, FR, RL, RR]
                waterC: raw.waterTemp,
                oilC: raw.oilTemp
            },
            suspension: {
                shockDeflection: raw.suspensionTravel
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
