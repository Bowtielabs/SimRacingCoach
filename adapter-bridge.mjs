/**
 * Bridge between adapter stdout and service HTTP
 * Reads JSON frames from adapter and posts to service
 */
import { spawn } from 'child_process';
import http from 'http';

const SERVICE_URL = 'http://localhost:7878';
const ADAPTER_PATH = './apps/adapters/iracing-node/adapter.mjs';

console.log('[Bridge] Starting adapter bridge...');
console.log('[Bridge] Adapter:', ADAPTER_PATH);
console.log('[Bridge] Service:', SERVICE_URL);

// Spawn the adapter
const adapter = spawn('node', [ADAPTER_PATH], {
    stdio: ['ignore', 'pipe', 'inherit'] // ignore stdin, pipe stdout, inherit stderr
});

let buffer = '';

// Read adapter stdout line by line
adapter.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
        if (!line.trim()) continue;

        try {
            const message = JSON.parse(line);

            // Handle different message types
            if (message.type === 'status') {
                console.log('[Bridge] Status:', message.state, '-', message.details);
            } else if (message.type === 'frame') {
                // Send frame to service (we'll just log for now since service doesn't have frame endpoint)
                // In production this would process locally
                process.stdout.write('.');
            }
        } catch (err) {
            console.error('[Bridge] Failed to parse line:', line);
        }
    }
});

adapter.on('close', (code) => {
    console.log(`[Bridge] Adapter exited with code ${code}`);
    process.exit(code || 0);
});

adapter.on('error', (err) => {
    console.error('[Bridge] Adapter error:', err);
    process.exit(1);
});

console.log('[Bridge] Bridge running - adapter output will be processed');
