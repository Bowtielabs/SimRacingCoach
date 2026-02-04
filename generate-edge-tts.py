import asyncio
import edge_tts
import os
import subprocess
import shutil

VOICE = "es-UY-MateoNeural"
OUTPUT_DIR = "core/ai_engines/piper/prerendered"
# Aggressive Radio Filter: Bandpass + Bitcrush + Distortion
RADIO_FILTER = "highpass=f=400, lowpass=f=2500, afftdn, acrusher=level_in=3:level_out=1:bits=8:mode=log:aa=1"

rules = {
    # --- SALUDOS ---
    'greeting-1': '¡Dale, dale! Ojos bien abiertos que hoy se corre fuerte.',
    'greeting-2': '¡Vamos fiera! Concentración total, yo te canto la data.',
    'greeting-3': '¡Pista habilitada! Hacé tu trabajo que nosotros nos ocupamos del resto.',
    'greeting-4': '¡A fondo hoy eh! Confianza en el auto, buscá el límite.',
    'coach-connected': 'Radio check. Copiado fuerte y claro. Estamos operativos.',
    
    # --- DRIVING ERRORS ---
    'throttle-punch': '¡No le pegues el zapatazo! Acariciá el acelerador a la salida.',
    'pedal-fidgeting': 'Estás indeciso con los pedales. Hacé una maniobra limpia, no dudes.',
    'brake-riding': '¡Sacá la pata del freno! Lo estás arrastrando y perdemos velocidad.',
    'soft-braking': 'Asegurá la frenada, te estás tirando muy suave. ¡Patada inicial fuerte!',
    'brake-stomp': '¡Epa! No bloquees todo. Modulá el pedal que vas a hacer plano.',
    'lazy-throttle': 'Dormiste en la salida. Acelerá antes, aprovechá la tracción.',
    'coasting-too-much': 'Estás paseando. O acelerás o frenás, no te quedes mirando el paisaje.',
    'throttle-overlap': 'Soltá el gas para meter el cambio, estás haciendo patinar el embrague.',
    'unfinished-braking': 'Te falta trail-braking. Mantené un pelito de freno hasta el vértice.',
    'brake-inconsistency': 'Referenciá mejor los carteles. Estás tirando el ancla en cualquier lado.',
    'redline-hanging': '¡Pasá el cambio! Lo estás matando al corte, perdemos empuje.',
    'early-short-shift': 'Estirá el cambio, no me tires la marcha tan corta que se muere.',
    'engine-braking-risk': '¡Cuidado con el rebaje! Vas a explotar la caja, bajá RPM antes.',
    'neutral-driving': '¡Enganchá una marcha! El auto está suelto, perdés control.',
    'slow-shifts': '¡Más rápida esa mano! Perdés dos décimas en cada cambio.',
    'wrong-gear-slow-corner': 'Te quedó larga la marcha. Bajá una más para tener pique.',
    'no-rev-match': 'Hacé punta-tacón. El auto se desacomoda si no igualás las vueltas.',
    
    # --- ENGINE & CAR HEALTH ---
    'engine-warnings-detected': '¡Alarma en el tablero! Chequeá presiones y temperaturas, cambio.',
    'tyres-too-cold': 'Gomas heladas. Hacé zig-zag y clavá frenos para levantar temperatura.',
    'tyres-overheating': '¡Estás cocinando las gomas! Aflojá un poco o nos quedamos sin caucho.',
    'thermal-imbalance-lr': 'Tenés el auto desbalanceado de temperatura. Ojo en los apoyos fuertes.',
    'thermal-imbalance-fb': 'Desastre térmico adelante y atrás. Revisá el reparto de frenada.',
    'brake-fade': '¡Frenos hirviendo! Refrigerá o te vas a quedar sin pedal.',
    'cold-engine-stress': '¡Tranquilo! El motor está frío, no lo castigues todavía.',
    'water-overheating': '¡Temperatura de agua crítica! Levantá ya o soplamos junta.',
    'fuel-critical-low': '¡Estamos secos! Entrá a boxes ya o nos quedamos a pata.',
    
    # --- SPEED & CONSISTENCY ---
    'top-speed-inconsistency': 'Te falta velocidad final. Salí mejor pisado a la recta.',
    'erratic-speed-variation': 'Mantené el ritmo. Venís a los tirones en la recta.',
    'inefficient-fuel-consumption': 'Venís tragando mucho. Hacé lift-and-coast, levantá antes del cartel.',
    'stalling-risk': '¡Embrague! Se te apaga el motor, no te duermas.',
    
    # --- TRACK POSITION / SECTORS (Generic) ---
    'sector-1-fast': '¡Récord en el uno! Venís volando.',
    'sector-1-slow': 'Perdimos tiempo en el primero. Ajustá la trazada.',
    'sector-2-fast': 'Sector dos violeta. Seguí así que bajamos el tiempo.',
    'sector-2-slow': 'Te quedaste en el sector dos. Ojo con la media velocidad.',
    'sector-3-fast': 'Cierre de vuelta impecable. ¡Abrí la próxima igual!',
    'sector-3-slow': 'Regalaste el final. Cuidá la tracción antes de la meta.',
    
    # --- SYSTEM ---
    'pit-enter': 'Pit lane. Limitador puesto, ojo la velocidad.',
    'pit-exit': 'Pista libre. Pisá la línea blanca y te sancionan.',
    'check-engine': 'Revisá relojes. Algo no me gusta en el motor.',
    
    # --- SUSPENSION & AERO (Phase 5) ---
    'suspension-bottoming': '¡Estás tocando fondo! El auto pancea, endurecé la suspensión.',
    'suspension-travel-limit': '¡Tope de amortiguador! Cortá los pianos que rompemos todo.',
    'aero-unstable-rake': 'El auto navega. El rake está muy inestable en frenaje.',
    'aero-drag-warning': 'Tenemos una pared de aire. Mucha carga, nos pasan como postes.',

    # --- ADVANCED DYNAMICS (Phase 6) ---
    'dyn-understeer-entry': 'Barriendo la trompa en la entrada. Soltá freno para que muerda.',
    'dyn-understeer-mid': 'Ida de trompa en el medio. Esperá la rotación antes de dar gas.',
    'dyn-snap-oversteer': '¡Latigazo! Corregí suave, no pelees con el volante.',
    'dyn-power-oversteer': 'Mucha potencia con la dirección cruzada. Dosificá el pie derecho.',
    'dyn-pendulum': 'Efecto péndulo. No tires el auto de un lado al otro, sé progresivo.',
    'dyn-excessive-roll': 'El auto rola demasiado. Endurecé las barras estabilizadoras.',
    'dyn-nose-dive': 'Mucho cabeceo en frenada. Subí la compresión delantera.',
    'dyn-rear-squat': 'El auto se sienta mucho al acelerar. Endurecé la trasera.',
    'dyn-scrub-radius': 'Estás arrastrando las gomas en lo lento. Abrí más la dirección.',
    'dyn-steering-lock': 'Estás cruzando demasiado los brazos. Usá más pista, no tanto volante.',

    'brk-early-release': 'Soltaste el freno muy pronto. Aguantalo hasta el vértice.',
    'brk-late-brake': 'Te tiraste muy tarde fiera. Referenciá antes, no somos héroes.',
    'brk-abs-reliance': 'Estás colgado del ABS. Frená al 90%, no mates el sistema.',
    'brk-migration-fwd': 'Frenada muy delantera. Tirá el balance de frenos para atrás.',
    'brk-migration-rwd': 'La cola te quiere pasar frenando. Pasá balance adelante.',
    'cor-early-apex': 'Le pegaste muy temprano a la cuerda. Te quedás sin pista a la salida.',
    'cor-missed-apex': 'Lejísimos del piano interno. Achicá el radio, regalás metros.',
    'cor-v-shape': 'Hacé la curva en V. Entrá fuerte, rotalo y salí derecho.',
    'cor-u-shape': 'Redondeá la trazada. Mantené velocidad de paso en lo rápido.',
    'brk-temperature-spike': '¡Fuego en los discos! Mové el reparto o refrigerá, se cristalizan.',

    'trac-wheelspin-low': 'Patinando en baja. Dosificá el pie o subí una marcha.',
    'trac-wheelspin-exit': 'Tracción comprometida. Enderezá el volante antes de planchar el acelerador.',
    'trac-short-shift': 'La pista está lavada. Tirá el cambio antes (short-shift) para no patinar.',
    'gr-grinding': '¡Cuidado la caja! Estás errando el cambio, marcá bien el movimiento.',
    'gr-money-shift': '¡Pasaste de vueltas el motor! Cuidado con los rebajes asesinos.',
    'gr-clutch-kick': '¿Qué hacés picando embrague? Esto no es drift, cuidá la transmisión.',
    'trac-tc-intrusion': 'El control de tracción te está frenando. Bajale un punto al TC.',
    'trac-diff-lock': 'El diferencial está muy abierto. Cerralo un poco para traccionar.',
    'trac-throttle-map': 'Estás muy nervioso con el gas. Suavizá el mapa de acelerador.',
    'gr-first-gear': 'No pongas primera en la horquilla, matás la inercia. Usá segunda.',

    'tyre-flat-spot': '¡Bloqueaste feo! Tenés un plano en la goma, vas a sentir la vibración.',
    'tyre-grainig': 'Graining delantero. La goma se está rompiendo por frío y arrastre.',
    'tyre-blistering': 'Ampollas en la banda de rodadura (blistering). Refrigerá esas gomas ya.',
    'tyre-puncture-slow': 'Pinchadura lenta detectada. Entrá a boxes, no llegamos.',
    'strat-box-window': 'Ventana de parada abierta. ¡Box, Box, Box esta vuelta!',
    'strat-push-pass': 'Tenés Push-to-Pass disponible. Usalo en la recta opuesta.',
    'strat-fuel-mix': 'Estamos cortos de nafta. Pasá a mapa económico (Mix 2).',
    'strat-brake-bias-adj': 'El tanque se vacía. Acordate de mover el freno para atrás.',
    'strat-blue-flag-ignore': 'Bandera azul agitada. Respetá al líder, levantá en la recta.',
    'strat-last-lap': 'Última vuelta. A morir nada, cuidá la cuerda y traelo a casa.',

    'mind-focus-loss': 'Perdiste el foco. Respirá hondo, mirá lejos y reseteá.',
    'mind-consistency': 'Sos un relojito suizo. Mantené ese ritmo, calco tras calco.',
    'mind-anger-management': '¡Cortala! Estás manejando con bronca y vas a romper todo. Cabeza fría.',
    'mind-breathing': 'Aprovechá la recta. Relajá las manos y respirá.',
    'race-gap-closing': 'Le descontaste tres décimas al de adelante. Ya lo tenés en succión.',
    'race-defense': 'Te buscan por adentro. Hacé el radio de giro defensivo.',
    'race-attack': 'Tirale el auto. Hacé la tijera a la salida.',
    'race-start-ready': 'Primera colocada. Buscá el punto de fricción del embrague... ¡Verde!',
    'race-finish-cool': 'Bandera a cuadros. Vuelta de honor tranquila, refrigerá frenos.',
    'race-damage-report': 'El auto está herido. Llevelo despacito a boxes.',
}

def apply_radio_filter(input_file):
    if not shutil.which("ffmpeg"):
         print("⚠️ FFmpeg not found, skipping radio filter.")
         return

    temp_file = input_file.replace(".wav", "_filtered.wav")
    try:
        # Advanced Filter: Voice Filter + Pink Noise Background
        # 1. Generate pink noise (anoisesrc)
        # 2. Filter voice (highpass/lowpass/crusher)
        # 3. Mix voice and noise
        filter_complex = (
            "anoisesrc=d=0.5:c=pink:r=44100:a=0.05[noise];" 
            "[0:a]highpass=f=400,lowpass=f=2500,afftdn,acrusher=level_in=5:level_out=1:bits=8:mode=log:aa=1[voice];" 
            "[voice][noise]amix=inputs=2:duration=first[out]"
        )
        
        subprocess.run([
            "ffmpeg", "-y", "-i", input_file, 
            "-filter_complex", filter_complex,
            "-map", "[out]",
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
