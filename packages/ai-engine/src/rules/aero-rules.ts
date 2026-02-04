
import { TelemetryRule } from '../telemetry-rules-engine';

export const AERO_RULES: TelemetryRule[] = [
    {
        id: 'aero-unstable-rake',
        category: 'technique', // or strategy/setup
        priority: 6,
        condition: (d) => {
            // Trigger if rake varies wildly during braking/cornering
            return d.patterns.rakeInstabilityCount > 10;
        },
        advice: 'El auto está inestable, el rake varía demasiado en frenada.',
        cooldown: 50
    },
    {
        id: 'aero-drag-warning',
        category: 'strategy',
        priority: 4,
        condition: (d) => {
            // Heuristic: High RPM in top gear but low top speed compared to average?
            // This is hard without car knowledge.
            // Simplified: If avg speed is high but fuel usage is extreme?
            // Let's use a placeholder condition for now or base it on rake
            // If rake is very high (> 20mm positive) and speed is high.
            if (!d.current.aero?.rake) return false;
            return d.current.aero.rake > 0.025 && d.averages.speed > 200;
        },
        advice: 'Mucha carga aerodinámica, estamos perdiendo velocidad punta.',
        cooldown: 120
    }
];
