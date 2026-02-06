import asyncio
import edge_tts
import os
import subprocess
import shutil

VOICE = "es-UY-MateoNeural"
OUTPUT_DIR = "core/ai_engines/piper/prerendered"
# Aggressive Radio Filter: Bandpass + Bitcrush + Distortion
RADIO_FILTER = "highpass=f=400, lowpass=f=2500, afftdn, acrusher=level_in=3:level_out=1:bits=8:mode=log:aa=1"

messages = {
    'num_0': 'cero',
    'num_1': 'uno',
    'num_2': 'dos',
    'num_3': 'tres',
    'num_4': 'cuatro',
    'num_5': 'cinco',
    'num_6': 'seis',
    'num_7': 'siete',
    'num_8': 'ocho',
    'num_9': 'nueve',
    'num_point': 'punto',
    'lap_time_intro': 'Tiempo',
    'lap_improved': '¡Buena vuelta! Bajaste el tiempo',
    'lap_worse': 'Vuelta lenta, a concentrarse'
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

    print("\n🔊 Generando NUMEROS Y FRASES con Edge TTS + Filtro Radio")
    print(f"Voz: {VOICE}")
    print(f"Filtro: {RADIO_FILTER}\n")
    
    tasks = []
    items = list(messages.items())
    total = len(items)
    
    for i, (rule_id, text) in enumerate(items, 1):
        tasks.append(generate_audio(rule_id, text, i, total))
    
    await asyncio.gather(*tasks)
    
    print("\n✅ GENERACIÓN COMPLETA!\n")

if __name__ == "__main__":
    asyncio.run(main())
