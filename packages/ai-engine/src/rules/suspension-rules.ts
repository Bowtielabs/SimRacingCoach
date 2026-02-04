
import { TelemetryRule } from '../telemetry-rules-engine';

export const SUSPENSION_RULES: TelemetryRule[] = [
    {
        id: 'suspension-bottoming',
        category: 'technique',
        priority: 6,
        condition: (d) => {
            // Trigger if we hit bottoming more than 5 times in 30s
            // This suggests setup is too soft or ride height too low
            return d.patterns.bottomingCount > 5;
        },
        advice: 'Estás golpeando el fondo plano, endurecé la compresión rápida.',
        cooldown: 60
    },
    {
        id: 'suspension-travel-limit',
        category: 'technique',
        priority: 7,
        condition: (d) => {
            if (!d.current?.suspension?.shockDeflection) return false;
            // Check if ANY shock is currently deeply compressed (instant warning)
            return d.current.suspension.shockDeflection.some(val => Math.abs(val) > 0.13);
        },
        advice: 'Ojo con los cortes, la suspensión está llegando al tope.',
        cooldown: 20
    }
];
