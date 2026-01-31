import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
export const ADAPTER_SPECS = [
    { id: 'iracing', label: 'iRacing', simName: 'iRacing' },
    { id: 'ams2', label: 'AMS2', simName: 'Automobilista 2' },
    { id: 'raceroom', label: 'RaceRoom', simName: 'RaceRoom Racing Experience' },
    { id: 'rfactor', label: 'rFactor', simName: 'rFactor' },
    { id: 'rfactor2', label: 'rFactor 2', simName: 'rFactor 2' },
    { id: 'automobilista', label: 'Automobilista', simName: 'Automobilista' },
    { id: 'simutc', label: 'SimuTC', simName: 'SimuTC' },
    { id: 'ac', label: 'Assetto Corsa', simName: 'Assetto Corsa' },
    { id: 'acc', label: 'ACC', simName: 'Assetto Corsa Competizione' },
    { id: 'mock-iracing', label: 'iRacing (Mock)', simName: 'iRacing Mock' },
    { id: 'other', label: 'Other', simName: 'Other' },
];
export class AdapterSupervisor extends EventEmitter {
    adapterId;
    resolveCommand;
    env;
    child = null;
    buffer = '';
    stopRequested = false;
    restartAttempts = 0;
    restartTimer;
    lastStatus;
    constructor(options) {
        super();
        this.adapterId = options.adapterId;
        this.resolveCommand = options.resolveCommand;
        this.env = options.env;
    }
    start() {
        this.stopRequested = false;
        this.restartAttempts = 0;
        this.spawnAdapter();
    }
    stop() {
        this.stopRequested = true;
        this.restartAttempts = 0;
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = undefined;
        }
        if (this.child) {
            this.child.kill();
            this.child = null;
        }
        this.emitStatus({
            type: 'status',
            state: 'disconnected',
            sim: this.adapterId,
            details: 'Stopped',
        });
    }
    async spawnAdapter() {
        if (this.stopRequested) {
            return;
        }
        const resolved = await this.resolveCommand(this.adapterId);
        if (!resolved) {
            this.emitStatus({
                type: 'status',
                state: 'error',
                sim: this.adapterId,
                details: 'Adapter command not available.',
            });
            return;
        }
        try {
            this.child = spawn(resolved.command, resolved.args, {
                env: { ...process.env, ...this.env, ...resolved.env },
                cwd: resolved.cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        }
        catch (error) {
            this.emitStatus({
                type: 'status',
                state: 'error',
                sim: this.adapterId,
                details: `Failed to start adapter: ${String(error)}`,
            });
            return;
        }
        if (!this.child) {
            return;
        }
        this.child.stdout.setEncoding('utf8');
        this.child.stderr.setEncoding('utf8');
        this.child.stdout.on('data', (chunk) => this.handleStdout(chunk));
        this.child.stderr.on('data', (chunk) => this.handleStderr(chunk));
        this.child.on('error', (error) => {
            this.emitStatus({
                type: 'status',
                state: 'error',
                sim: this.adapterId,
                details: `Adapter error: ${String(error)}`,
            });
        });
        this.child.on('exit', (code, signal) => this.handleExit(code, signal));
    }
    handleStdout(chunk) {
        this.buffer += chunk;
        while (this.buffer.includes('\n')) {
            const idx = this.buffer.indexOf('\n');
            const line = this.buffer.slice(0, idx).trim();
            this.buffer = this.buffer.slice(idx + 1);
            if (!line) {
                continue;
            }
            // DEBUG: Logs comentados para limpieza
            // if (Math.random() < 0.01) {
            //   console.log('[Supervisor DEBUG] Parsing line:', line.substring(0, 200));
            // }
            try {
                const parsed = JSON.parse(line);
                this.handleMessage(parsed);
            }
            catch (error) {
                // DEBUG: Logs comentados para limpieza
                // console.error('[Supervisor ERROR] Failed to parse line:', line.substring(0, 100), String(error));
                this.emit('log', {
                    type: 'log',
                    level: 'warn',
                    message: `Invalid adapter output: ${String(error)}`,
                });
            }
        }
    }
    handleStderr(chunk) {
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
            this.emit('log', {
                type: 'log',
                level: 'warn',
                message: line,
            });
        }
    }
    handleMessage(message) {
        // DEBUG: Logs comentados para limpieza
        // if (message.type === 'frame') {
        //   console.log('[AdapterSupervisor] Received frame message, emitting...');
        // }
        if (message.type === 'status') {
            this.emitStatus(message);
            return;
        }
        this.emit(message.type, message);
    }
    emitStatus(message) {
        this.lastStatus = message;
        this.emit('status', message);
    }
    handleExit(code, signal) {
        this.child = null;
        if (this.stopRequested) {
            return;
        }
        const detail = `Adapter exited (${code ?? 'unknown'}${signal ? ` ${signal}` : ''})`;
        this.emitStatus({
            type: 'status',
            state: 'disconnected',
            sim: this.adapterId,
            details: detail,
        });
        const delays = [1000, 2000, 4000, 8000, 16000, 30000];
        const delay = delays[Math.min(this.restartAttempts, delays.length - 1)];
        this.restartAttempts += 1;
        this.restartTimer = setTimeout(() => this.spawnAdapter(), delay);
    }
}
export function getAdapterSpec(adapterId) {
    return (ADAPTER_SPECS.find((spec) => spec.id === adapterId) ?? {
        id: adapterId,
        label: adapterId,
        simName: adapterId,
    });
}
//# sourceMappingURL=index.js.map