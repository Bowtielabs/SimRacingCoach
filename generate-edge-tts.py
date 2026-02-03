import asyncio
import edge_tts
import os

VOICE = "es-AR-TomasNeural"
OUTPUT_DIR = "core/ai_engines/piper/prerendered"

rules = {
    'greeting-1': '¡Dale dale! Te voy a estar mirando y te ayudo a mejorar.',
    'greeting-2': '¡Vamos vamos! Estoy acá con vos, te voy dando consejos.',
    'greeting-3': '¡Arrancamos! Mandale mecha a la pista que yo te voy guiando.',
    'greeting-4': '¡Dale que podés! Vamos por ese tiempazo, estoy con vos.',
    'coach-connected': 'Entrenador virtual conectado',
    'throttle-punch': 'Entrada de potencia muy brusca, aplicá el acelerador más gradual',
    'pedal-fidgeting': 'Demasiado movimiento en los pedales, suavizá las transiciones',
    'brake-riding': 'Estás pisando freno y acelerador al mismo tiempo, es ineficiente',
    'soft-braking': 'Frenadas muy suaves, metele más presión inicial',
    'brake-stomp': 'Frenadas muy bruscas, graduar mejor la presión del pedal',
    'lazy-throttle': 'Estás demorando mucho en acelerar después del ápice, dale antes',
    'coasting-too-much': 'Estás yendo mucho en vacío, perdés tiempo sin acelerar ni frenar',
    'throttle-overlap': 'Levantás mucho el acelerador en los cambios, perdés potencia',
    'unfinished-braking': 'Te falta frenada en curva, soltá el freno gradual mientras girás',
    'brake-inconsistency': 'Frenadas inconsistentes, buscá puntos de referencia fijos',
    'redline-hanging': 'Estás colgado del limitador, cambiá antes para mantener potencia',
    'early-short-shift': 'Cambios muy prematuros, aprovechá más el rango de revoluciones',
    'engine-braking-risk': 'Mucho freno motor, cuidado con romper el cambio',
    'neutral-driving': 'Estás en punto muerto andando, enganchá una marcha',
    'slow-shifts': 'Cambios muy lentos, practicá la velocidad de palanca',
    'wrong-gear-slow-corner': 'Marcha muy larga para curva lenta, bajá una más',
    'no-rev-match': 'No estás haciendo punta-tacón, igualá las revoluciones en la bajada',
    'engine-warnings-detected': '¡Alerta del motor detectada! Revisá la telemetría',
    'tyres-too-cold': 'Gomas muy frías (menos de sesenta y cinco grados), hacé serpentinas',
    'tyres-overheating': 'Neumáticos sobrecalentados (más de cien grados), reducí agresividad',
    'thermal-imbalance-lr': 'Desbalance térmico izquierda derecha en gomas, revisá la configuración',
    'thermal-imbalance-fb': 'Desbalance térmico delantero trasero, ajustá balance aerodinámico',
    'brake-fade': 'Frenos a más de cuatrocientos grados, peligro de fatiga por calor',
    'cold-engine-stress': 'Motor frío con mucha exigencia, cuidado que el aceite está frío',
    'water-overheating': 'Temperatura de agua crítica (más de ciento cinco grados), levantá que se recalienta',
    'top-speed-inconsistency': 'Velocidad de punta inconsistente, mantené el gas a fondo en recta',
    'erratic-speed-variation': 'Variaciones erráticas de velocidad en recta, suavizá',
    'inefficient-fuel-consumption': 'Consumo de combustible ineficiente, levantá antes de frenar',
    'fuel-critical-low': '¡Menos de cinco litros de nafta! Entrá a boxes o gestioná',
    'stalling-risk': '¡Riesgo de calado! Revoluciones muy bajas, bajá de marcha o acelerá'
}

async def generate_audio(rule_id, text, index, total):
    output_file = os.path.join(OUTPUT_DIR, f"{rule_id}.wav")
    print(f"[{index}/{total}] {rule_id}.wav...", end=" ", flush=True)
    
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(output_file)
        print("✓")
    except Exception as e:
        print(f"✗ {e}")

async def main():
    print("\n🔊 Generando 35 archivos WAV con Edge TTS")
    print(f"Voz: {VOICE} (Male, Argentinian Spanish)\n")
    
    tasks = []
    items = list(rules.items())
    total = len(items)
    
    for i, (rule_id, text) in enumerate(items, 1):
        tasks.append(generate_audio(rule_id, text, i, total))
    
    await asyncio.gather(*tasks)
    
    print("\n✅ GENERACIÓN COMPLETA!\n")

if __name__ == "__main__":
    asyncio.run(main())
