#!/usr/bin/env node
/**
 * Download Models Script
 * Downloads AI models and binaries for the Universal AI Coach
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_ENGINES_DIR = __dirname;

// Model URLs
const MODELS = {
    'faster-whisper': {
        binary: {
            url: 'https://github.com/SYSTRAN/faster-whisper/releases/download/v0.10.0/faster-whisper-0.10.0-win-amd64.zip',
            dest: 'faster-whisper/faster-whisper.exe'
        },
        model: {
            url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
            dest: 'faster-whisper/models/whisper-tiny.bin'
        }
    },
    'llama-cpp': {
        binary: {
            url: 'https://github.com/ggerganov/llama.cpp/releases/download/b3690/llama-b3690-bin-win-avx2-x64.zip',
            dest: 'llama-cpp/llama-server.exe'
        },
        model: {
            url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
            dest: 'llama-cpp/models/llama-3.2-1b-q4.gguf'
        }
    },
    'piper': {
        binary: {
            url: 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip',
            dest: 'piper/piper.exe'
        },
        model: {
            url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_AR/tux/medium/es_AR-tux-medium.onnx',
            dest: 'piper/voices/es_AR-tux-medium.onnx'
        },
        config: {
            url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_AR/tux/medium/es_AR-tux-medium.onnx.json',
            dest: 'piper/voices/es_AR-tux-medium.onnx.json'
        }
    }
};

async function downloadFile(url, dest, onProgress) {
    console.log(`[Download] ${url} -> ${dest}`);

    const fullPath = path.join(AI_ENGINES_DIR, dest);
    const dir = path.dirname(fullPath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Check if already exists
    try {
        await fs.access(fullPath);
        console.log(`[Skip] ${dest} already exists`);
        return;
    } catch {
        // File doesn't exist, proceed with download
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0');
    let downloaded = 0;

    const fileStream = createWriteStream(fullPath);

    if (!response.body) {
        throw new Error('Response body is null');
    }

    const reader = response.body.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(value);
        downloaded += value.length;

        if (onProgress && totalSize > 0) {
            const percentage = (downloaded / totalSize * 100).toFixed(1);
            onProgress(downloaded, totalSize, percentage);
        }
    }

    fileStream.end();
    console.log(`[Done] ${dest}`);
}

async function main() {
    console.log('=== AI Engines Model Downloader ===\n');

    for (const [engine, files] of Object.entries(MODELS)) {
        console.log(`\n[${engine.toUpperCase()}]`);

        for (const [name, { url, dest }] of Object.entries(files)) {
            try {
                await downloadFile(url, dest, (downloaded, total, percentage) => {
                    process.stdout.write(`\r  ${name}: ${percentage}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`);
                });
                process.stdout.write('\n');
            } catch (error) {
                console.error(`  Error downloading ${name}:`, error.message);
            }
        }
    }

    console.log('\n=== Download Complete ===\n');
    console.log('Total size: ~940MB');
    console.log('Location:', AI_ENGINES_DIR);
}

main().catch(console.error);
