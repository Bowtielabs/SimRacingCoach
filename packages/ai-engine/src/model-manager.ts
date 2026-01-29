/**
 * Model Manager
 * Handles downloading, verification, and management of AI models
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import type { ModelSpec, ModelStatus, DownloadProgress } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../models');

/**
 * Available models for download
 */
export const AVAILABLE_MODELS: ModelSpec[] = [
    {
        name: 'llama-3.2-1b-q4',
        url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
        size: 850,
        checksum: '', // Will be verified after download
        required: true,
        type: 'llm'
    },
    {
        name: 'whisper-tiny-multilingual',
        url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
        size: 75,
        checksum: '',
        required: true,
        type: 'stt'
    },
    {
        name: 'piper-es-ar',
        url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_AR/tux/medium/es_AR-tux-medium.onnx',
        size: 15,
        checksum: '',
        required: false, // Spanish Argentina voice
        type: 'tts'
    },
    {
        name: 'piper-es-es',
        url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx',
        size: 15,
        checksum: '',
        required: false, // Spanish Spain voice (fallback)
        type: 'tts'
    },
    {
        name: 'piper-en-us',
        url: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
        size: 15,
        checksum: '',
        required: false, // English voice
        type: 'tts'
    }
];

export class ModelManager {
    private modelsDir: string;

    constructor(modelsDir: string = MODELS_DIR) {
        this.modelsDir = modelsDir;
    }

    /**
     * Ensure models directory exists
     */
    private async ensureModelsDir(): Promise<void> {
        try {
            await fs.access(this.modelsDir);
        } catch {
            await fs.mkdir(this.modelsDir, { recursive: true });
        }
    }

    /**
     * Get path for a model
     */
    private getModelPath(modelName: string): string {
        const model = AVAILABLE_MODELS.find(m => m.name === modelName);
        if (!model) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        const ext = model.url.endsWith('.gguf') ? '.gguf' : '.onnx';
        if (model.url.includes('whisper')) {
            return path.join(this.modelsDir, `${modelName}.bin`);
        }
        return path.join(this.modelsDir, `${modelName}${ext}`);
    }

    /**
     * Check if a model is installed
     */
    async isInstalled(modelName: string): Promise<boolean> {
        const modelPath = this.getModelPath(modelName);
        try {
            await fs.access(modelPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get status of all models
     */
    async checkModels(): Promise<ModelStatus[]> {
        await this.ensureModelsDir();

        const statuses: ModelStatus[] = [];

        for (const model of AVAILABLE_MODELS) {
            const modelPath = this.getModelPath(model.name);
            const installed = await this.isInstalled(model.name);

            let size: number | undefined;
            let verified = false;

            if (installed) {
                try {
                    const stats = await fs.stat(modelPath);
                    size = Math.round(stats.size / (1024 * 1024)); // MB
                    // Verify size is reasonable (within 10% of expected)
                    verified = Math.abs(size - model.size) / model.size < 0.1;
                } catch {
                    verified = false;
                }
            }

            statuses.push({
                name: model.name,
                installed,
                verified,
                size,
                path: installed ? modelPath : undefined
            });
        }

        return statuses;
    }

    /**
     * Download a single model
     */
    async downloadModel(
        modelName: string,
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<void> {
        const model = AVAILABLE_MODELS.find(m => m.name === modelName);
        if (!model) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        await this.ensureModelsDir();
        const modelPath = this.getModelPath(modelName);

        console.log(`[ModelManager] Downloading ${model.name} from ${model.url}`);

        try {
            const response = await fetch(model.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const totalSize = parseInt(response.headers.get('content-length') || '0');
            let downloaded = 0;
            const startTime = Date.now();

            const fileStream = createWriteStream(modelPath);

            if (!response.body) {
                throw new Error('Response body is null');
            }

            // Track progress
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                downloaded += value.length;

                if (onProgress) {
                    const elapsed = (Date.now() - startTime) / 1000; // seconds
                    const speed = downloaded / (1024 * 1024) / elapsed; // MB/s

                    onProgress({
                        modelName: model.name,
                        downloaded: downloaded / (1024 * 1024),
                        total: model.size,
                        percentage: totalSize > 0 ? (downloaded / totalSize) * 100 : 0,
                        speed
                    });
                }
            }

            // Write all chunks - combine Uint8Arrays
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
            await fs.writeFile(modelPath, combined);

            console.log(`[ModelManager] Download complete: ${model.name}`);
        } catch (error) {
            // Clean up partial download
            try {
                await fs.unlink(modelPath);
            } catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }

    /**
     * Download all missing required models
     */
    async downloadMissing(
        onProgress?: (progress: DownloadProgress) => void
    ): Promise<void> {
        const statuses = await this.checkModels();
        const missing = statuses.filter(s => !s.installed || !s.verified);
        const requiredMissing = missing.filter(s =>
            AVAILABLE_MODELS.find(m => m.name === s.name)?.required
        );

        if (requiredMissing.length === 0) {
            console.log('[ModelManager] All required models are installed');
            return;
        }

        console.log(`[ModelManager] Downloading ${requiredMissing.length} missing models...`);

        for (const status of requiredMissing) {
            await this.downloadModel(status.name, onProgress);
        }

        console.log('[ModelManager] All models downloaded successfully');
    }

    /**
     * Verify integrity of a model
     */
    async verifyIntegrity(modelName: string): Promise<boolean> {
        const modelPath = this.getModelPath(modelName);
        const model = AVAILABLE_MODELS.find(m => m.name === modelName);

        if (!model) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        try {
            const stats = await fs.stat(modelPath);
            const sizeMB = Math.round(stats.size / (1024 * 1024));

            // Verify size is within 10% of expected
            return Math.abs(sizeMB - model.size) / model.size < 0.1;
        } catch {
            return false;
        }
    }

    /**
     * Verify all installed models
     */
    async verifyAll(): Promise<boolean> {
        const statuses = await this.checkModels();
        const required = statuses.filter(s =>
            AVAILABLE_MODELS.find(m => m.name === s.name)?.required
        );

        return required.every(s => s.installed && s.verified);
    }

    /**
     * Get model path if installed
     */
    async getModelPathIfInstalled(modelName: string): Promise<string | null> {
        const installed = await this.isInstalled(modelName);
        return installed ? this.getModelPath(modelName) : null;
    }

    /**
     * Delete a model
     */
    async deleteModel(modelName: string): Promise<void> {
        const modelPath = this.getModelPath(modelName);
        try {
            await fs.unlink(modelPath);
            console.log(`[ModelManager] Deleted model: ${modelName}`);
        } catch (error) {
            console.error(`[ModelManager] Failed to delete ${modelName}:`, error);
            throw error;
        }
    }

    /**
     * Get total size of all required models
     */
    getTotalRequiredSize(): number {
        return AVAILABLE_MODELS
            .filter(m => m.required)
            .reduce((sum, m) => sum + m.size, 0);
    }
}

export default ModelManager;
