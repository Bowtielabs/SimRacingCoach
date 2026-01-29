#!/usr/bin/env node
/**
 * Download AI Models Script
 * Downloads all required AI models for SimRacing Coach
 */

import { ModelManager } from '../packages/ai-engine/dist/model-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, '../packages/ai-engine/models');

const manager = new ModelManager(modelsDir);

console.log('🤖 SimRacing Coach - AI Model Downloader');
console.log('========================================\n');

async function main() {
    try {
        // Check current status
        console.log('📊 Checking installed models...\n');
        const statuses = await manager.checkModels();

        console.log('Model Status:');
        console.log('─'.repeat(80));
        for (const status of statuses) {
            const icon = status.installed ? '✅' : '❌';
            const sizeStr = status.size ? `${status.size}MB` : 'Not installed';
            console.log(`${icon} ${status.name.padEnd(30)} | ${sizeStr.padEnd(15)} | ${status.verified ? 'Verified' : 'Not verified'}`);
        }
        console.log('─'.repeat(80));
        console.log('');

        // Download missing models
        const missing = statuses.filter(s => !s.installed || !s.verified);

        // Import AVAILABLE_MODELS to check which are required
        const { AVAILABLE_MODELS } = await import('../packages/ai-engine/dist/model-manager.js');

        const requiredMissing = missing.filter(s => {
            const modelSpec = AVAILABLE_MODELS.find(m => m.name === s.name);
            return modelSpec?.required;
        });

        if (requiredMissing.length === 0) {
            console.log('✅ All required models are already installed!');
            return;
        }

        console.log(`📥 Downloading ${requiredMissing.length} missing models...\n`);

        for (const status of requiredMissing) {
            console.log(`\n⬇️  Downloading ${status.name}...`);

            await manager.downloadModel(status.name, (progress) => {
                const percent = progress.percentage.toFixed(1);
                const downloaded = progress.downloaded.toFixed(1);
                const speed = progress.speed.toFixed(2);
                process.stdout.write(`\r   Progress: ${percent}% (${downloaded}MB / ${progress.total}MB) @ ${speed} MB/s`);
            });

            console.log('\n   ✅ Download complete!');
        }

        console.log('\n\n🎉 All models downloaded successfully!');
        console.log('You can now use the full AI coaching system.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
