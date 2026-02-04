/**
 * Test script to simulate AI coaching pipeline:
 * 1. Send simulated telemetry
 * 2. Get LLM coaching advice
 * 3. Speak advice via Piper
 */

import { LlamaCppAgent, PrerenderedAudioAgent, AICoachingService } from '@simracing/ai-engine';
import type { TelemetryFrame } from '@simracing/core';

async function testCoachingPipeline() {
    console.log('🧪 Testing AI Coaching Pipeline...\n');

    try {
        // Step 1: Initialize agents
        console.log('[1/4] Initializing LLM and Audio agents...');
        const llm = new LlamaCppAgent();
        await llm.start();
        llm.setLanguage('es');

        const audio = new PrerenderedAudioAgent();
        await audio.initialize();
        console.log('✅ Agents initialized\n');

        // Step 2: Create AI Coaching Service with external agents
        console.log('[2/4] Creating AI Coaching Service...');
        const aiService = new AICoachingService({
            enabled: true,
            mode: 'ai',
            language: { stt: 'es', tts: 'es' }
        }, audio);

        await aiService.initialize();
        console.log('✅ AI Service initialized\n');

        // Step 3: Start session
        console.log('[3/4] Starting coaching session...');
        aiService.startSession({
            simName: 'iracing',
            trackId: 'test-track',
            carId: 'test-car',
            sessionType: 'practice',
            sessionId: 'test-session',
            startTime: Date.now(),
            totalLaps: 10,
            currentLap: 1,
            bestLapTime: null,
            averageLapTime: null,
            consistency: 0
        });
        console.log('✅ Session started\n');

        // Step 4: Send simulated telemetry frames
        console.log('[4/4] Sending simulated telemetry...');

        // Simulate driving for 10 seconds to trigger AI analysis
        for (let i = 0; i < 60; i++) {
            const frame: TelemetryFrame = {
                t: Date.now(),
                sim: 'iracing',
                sessionId: 'test-session',
                player: { position: 5, classPosition: 3 },
                traffic: { carLeftRight: 0 },
                flags: { sessionFlags: 268698112 },
                powertrain: {
                    speedKph: 150 + Math.random() * 50, // 150-200 km/h
                    rpm: 6000 + Math.random() * 2000,   // 6000-8000 RPM
                    gear: 4,
                    throttle: 0.7 + Math.random() * 0.3, // 70-100%
                    brake: Math.random() < 0.2 ? Math.random() * 0.5 : 0,
                    clutch: 0
                },
                temps: {
                    waterC: 85 + Math.random() * 10,  // 85-95°C
                    oilC: 90 + Math.random() * 10,
                    trackC: 25,
                    airC: 22
                },
                fuel: {
                    level: 50,
                    levelPct: 50,
                    usePerHour: 30
                },
                session: {
                    onPitRoad: false,
                    inGarage: false,
                    incidents: 0,
                    lap: 1,
                    lapsCompleted: 0,
                    sessionTime: i * 1000,
                    sessionLapsRemain: 9,
                    sessionTimeRemain: 600000
                },
                lapTimes: {
                    best: 85.5,
                    last: 86.2,
                    current: (i * 1000) / 1000
                },
                engineWarnings: 0
            };

            await aiService.processFrame(frame);

            // Log progress every 10 frames
            if (i % 10 === 0) {
                console.log(`  📊 Processed ${i + 1}/60 frames...`);
            }

            // Wait 200ms between frames (simulates ~5 FPS)
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('\n✅ Test complete! AI should have generated coaching advice.');
        console.log('   If you heard voice output, the entire pipeline is working! 🎉\n');

        // Cleanup
        setTimeout(() => {
            console.log('Cleaning up...');
            aiService.dispose();
            process.exit(0);
        }, 5000);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run test
testCoachingPipeline();
