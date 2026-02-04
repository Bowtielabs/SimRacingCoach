import asyncio
import edge_tts
import os
import subprocess
import shutil

VOICE = "es-AR-TomasNeural"
OUTPUT_DIR = "core/ai_engines/piper/prerendered"
RADIO_FILTER = "highpass=f=300, lowpass=f=3500, afftdn" # Bandpass filter for radio effect

rules = {
    # --- SALUDOS ---
    'greeting-1': '¡Dale dale! Te voy a estar mirando y te ayudo a mejorar.',
    'greeting-2': '¡Vamos vamos! Estoy acá con vos, te voy dando consejos.',
    'greeting-3': '¡Arrancamos! Mandale mecha a la pista que yo te voy guiando.',
    'greeting-4': '¡Dale que podés! Vamos por ese tiempazo, estoy con vos.',
    'coach-connected': 'Ingeniero de pista conectado. Radio check, cambio.',
    
    # --- DRIVING ERRORS ---
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
    
    # --- ENGINE & CAR HEALTH ---
    'engine-warnings-detected': '¡Alerta del motor detectada! Revisá la telemetría, cambio.',
    'tyres-too-cold': 'Neumáticos fríos, hacé zig zag para calentar.',
    'tyres-overheating': 'Gomas sobrecalentadas, bajá el ritmo y cuidá la tracción.',
    'thermal-imbalance-lr': 'Desbalance térmico lateral, revisá la presión de los neumáticos.',
    'thermal-imbalance-fb': 'Desbalance térmico eje delantero trasero, ajustá el balance de freno.',
    'brake-fade': 'Frenos hirviendo, perdés eficacia. Refrigerá.',
    'cold-engine-stress': 'Motor frío, no lo exijas hasta que tome temperatura.',
    'water-overheating': 'Agua crítica, temperatura alta. Levantá el pie o entrá a boxes.',
    'fuel-critical-low': 'Combustible crítico. Entrá a boxes esta vuelta.',
    
    # --- SPEED & CONSISTENCY ---
    'top-speed-inconsistency': 'Velocidad punta inconsistente, salí mejor de la curva anterior.',
    'erratic-speed-variation': 'Estás variando mucho la velocidad en recta, mantené el pedal a fondo.',
    'inefficient-fuel-consumption': "Consumo alto. Hacé 'lift and coast', soltá antes de frenar.",
    'stalling-risk': '¡Cuidado! Se te apaga el motor, embrague a fondo.',
    
    # --- TRACK POSITION / SECTORS (Generic) ---
    'sector-1-fast': 'Buen sector uno, venimos rápido.',
    'sector-1-slow': 'Perdimos tiempo en el sector uno, mejorá la salida.',
    'sector-2-fast': 'Sector dos en verde, seguí así.',
    'sector-2-slow': 'Sector dos lento, concentrate.',
    'sector-3-fast': 'Cerrando vuelta rápido, bien ahí.',
    'sector-3-slow': 'Final de vuelta flojo, cuidá la entrada a la recta.',
    
    # --- SYSTEM ---
    'pit-enter': 'Entrando a boxes, limitador puesto.',
    'pit-exit': 'Saliendo de boxes, ojo a la línea blanca.',
    'check-engine': 'Revisá instrumentos, algo no va bien.',
}

def apply_radio_filter(input_file):
    if not shutil.which("ffmpeg"):
         print("⚠️ FFmpeg not found, skipping radio filter.")
         return

    temp_file = input_file.replace(".wav", "_filtered.wav")
    try:
        # ffmpeg -i input.wav -af "highpass=f=200,lowpass=f=3000" output.wav
        subprocess.run([
            "ffmpeg", "-y", "-i", input_file, 
            "-af", RADIO_FILTER, 
            temp_file
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Replace original with filtered
        os.replace(temp_file, input_file)
        print("📻", end="")
    except Exception as e:
        print(f"Filter error: {e}", end="")
        if os.path.exists(temp_file):
            os.remove(temp_file)

async def generate_audio(rule_id, text, index, total):
    output_file = os.path.join(OUTPUT_DIR, f"{rule_id}.wav")
    print(f"[{index}/{total}] {rule_id}...", end=" ", flush=True)
    
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(output_file)
        apply_radio_filter(output_file)
        print("✓")
    except Exception as e:
        print(f"✗ {e}")

async def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print("\n🔊 Generando archivos WAV con Edge TTS + Filtro Radio")
    print(f"Voz: {VOICE}")
    print(f"Filtro: {RADIO_FILTER}\n")
    
    tasks = []
    items = list(rules.items())
    total = len(items)
    
    for i, (rule_id, text) in enumerate(items, 1):
        tasks.append(generate_audio(rule_id, text, i, total))
    
    await asyncio.gather(*tasks)
    
    print("\n✅ GENERACIÓN COMPLETA!\n")

if __name__ == "__main__":
    asyncio.run(main())
