# Regenerate WAV files - CORRECT VERSION
# Piper generates PCM at 22050Hz (native), we need to resample to 44100Hz

$piperPath = "core/ai_engines/piper/piper/piper.exe"
$modelPath = "core/ai_engines/piper/es_AR-daniela.onnx"
$outputDir = "core/ai_engines/piper/prerendered"

$rules = @{
    'greeting-1'                   = '¡Dale dale! Te voy a estar mirando y te ayudo a mejorar.'
    'greeting-2'                   = '¡Vamos vamos! Estoy acá con vos, te voy dando consejos.'
    'greeting-3'                   = '¡Arrancamos! Concentrate en la pista que yo te voy guiando.'
    'greeting-4'                   = '¡Dale que podés! Vamos por ese tiempazo, estoy con vos.'
    'coach-connected'              = 'Entrenador virtual conectado'
    'throttle-punch'               = 'Entrada de potencia muy brusca, aplicá el acelerador más gradual'
    'pedal-fidgeting'              = 'Demasiado movimiento en los pedales, suavizá las transiciones'
    'brake-riding'                 = 'Estás pisando freno y acelerador al mismo tiempo, es ineficiente'
    'soft-braking'                 = 'Frenadas muy suaves, metele más presión inicial'
    'brake-stomp'                  = 'Frenadas muy bruscas, graduar mejor la presión del pedal'
    'lazy-throttle'                = 'Estás demorando mucho en acelerar después del apex, dale antes'
    'coasting-too-much'            = 'Estás yendo mucho en vacío, perdés tiempo sin acelerar ni frenar'
    'throttle-overlap'             = 'Levantás mucho el acelerador en los cambios, perdés potencia'
    'unfinished-braking'           = 'Te falta trail braking, soltá el freno gradual mientras girás'
    'brake-inconsistency'          = 'Frenadas inconsistentes, buscá puntos de referencia fijos'
    'redline-hanging'              = 'Estás colgado del limitador, cambiá antes para mantener potencia'
    'early-short-shift'            = 'Cambios muy prematuros, aprovechá más el rango de RPM'
    'engine-braking-risk'          = 'Mucho freno motor, cuidado con romper el cambio'
    'neutral-driving'              = 'Estás en punto muerto andando, enganchá una marcha'
    'slow-shifts'                  = 'Cambios muy lentos, practicá la velocidad de palanca'
    'wrong-gear-slow-corner'       = 'Marcha muy larga para curva lenta, bajá una más'
    'no-rev-match'                 = 'No estás haciendo punta-tacón, igualá las RPM en la bajada'
    'engine-warnings-detected'     = '¡Warning del motor detectado! Revisá la telemetría'
    'tyres-too-cold'               = 'Gomas muy frías (menos de 65°C), hacé serpentinas'
    'tyres-overheating'            = 'Neumáticos sobrecalentados (más de 100°C), reducí agresividad'
    'thermal-imbalance-lr'         = 'Desbalance térmico izquierda/derecha en gomas, revisá setup'
    'thermal-imbalance-fb'         = 'Desbalance térmico delantero/trasero, ajustá balance aerodinámico'
    'brake-fade'                   = 'Frenos a más de 400°C, peligro de fatiga por calor'
    'cold-engine-stress'           = 'Motor frío con mucha exigencia, cuidado que el aceite está frío'
    'water-overheating'            = 'Temperatura de agua crítica (más de 105°C), levantá que se recalienta'
    'top-speed-inconsistency'      = 'Velocidad de punta inconsistente, mantené el gas a fondo en recta'
    'erratic-speed-variation'      = 'Variaciones erráticas de velocidad en recta, suavizá'
    'inefficient-fuel-consumption' = 'Consumo de combustible ineficiente, levantá antes de frenar'
    'fuel-critical-low'            = '¡Menos de 5 litros de nafta! Entrá a boxes o gestioná'
    'stalling-risk'                = '¡Riesgo de calado! RPM muy bajas, bajá de marcha o acelerá'
}

$total = $rules.Count
$current = 0

Write-Host "`nRegenerando $total archivos WAV (22050Hz -> 44100Hz REAL)...`n" -ForegroundColor Cyan

foreach ($rule in $rules.GetEnumerator()) {
    $current++
    $ruleId = $rule.Key
    $text = $rule.Value
    $outputFile = "$outputDir/$ruleId.wav"
    
    $pct = [math]::Round(($current / $total) * 100)
    Write-Progress -Activity "Regenerando WAV files" -Status "$current de $total - $ruleId" -PercentComplete $pct
    
    Write-Host "[$current/$total] $ruleId..." -NoNewline
    
    # Generate raw PCM with Piper (native 22050Hz)
    $pcmFile = "$outputDir/$ruleId.pcm"
    echo $text | & $piperPath --model $modelPath --output_raw | Set-Content -Path $pcmFile -Encoding Byte
    
    # Convert PCM to WAV: INPUT=22050Hz, OUTPUT=44100Hz (resampling)
    ffmpeg -y -f s16le -ar 22050 -ac 1 -i $pcmFile -ar 44100 $outputFile 2>&1 | Out-Null
    
    Remove-Item $pcmFile -ErrorAction SilentlyContinue
    
    # Verify
    $rate = ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 $outputFile 2>$null
    $duration = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $outputFile 2>$null
    $dur = [math]::Round([double]$duration, 1)
    
    if ($rate -eq "44100") {
        Write-Host " ✓ 44100Hz (${dur}s)" -ForegroundColor Green
    }
    else {
        Write-Host " ✗ $rate Hz" -ForegroundColor Red
    }
}

Write-Progress -Activity "Regenerando WAV files" -Completed

# Sound completion beep
[console]::beep(800, 200); [console]::beep(1000, 200); [console]::beep(1200, 400)

Write-Host "`n✓ Regeneración completa con RESAMPLING correcto`n" -ForegroundColor Green
