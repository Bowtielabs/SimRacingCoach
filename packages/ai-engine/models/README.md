# AI Engine - Local AI Models Directory

## Model Storage
This directory stores the AI models used by SimRacing Coach:

- **LLM**: Llama 3.2 1B (Q4_K_M quantization) - ~850 MB
- **STT**: Faster-Whisper Tiny (multilingual) - ~75 MB
- **TTS**: Piper TTS (Spanish Argentina + others) - ~15 MB per language

## Auto-Download
Models are automatically downloaded on first run if not present.

## Manual Download
If you want to pre-download models:

```bash
# From project root
pnpm --filter @simracing/ai-engine download-models
```

## Supported Languages

### STT (Faster-Whisper)
- Spanish (es) - Default
- English (en)
- Portuguese (pt)
- French (fr)
- Italian (it)

### TTS (Piper)
- Spanish Argentina (es_AR) - Default
- Spanish Spain (es_ES)
- English US (en_US)
- Portuguese Brazil (pt_BR)

## Model Files (Gitignored)
```
models/
├── llama-3.2-1b-q4_k_m.gguf
├── whisper-tiny-multilingual.bin
├── piper-es_AR-*.onnx
├── piper-es_ES-*.onnx
└── piper-en_US-*.onnx
```

**Note**: This directory is gitignored. Models are ~1 GB total.
