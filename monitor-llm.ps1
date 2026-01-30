Write-Host "`n🤖 MONITOR LLM - ENTRADA/SALIDA EN VIVO`n" -ForegroundColor Magenta
Write-Host "Esperando actividad del LLM..." -ForegroundColor Gray
Write-Host ""

$servicePath = "apps\service"
$logPattern = "📊|🎯|💬|⏳|🔊|✅|Velocidad:|RPM:|Acelerador:|Freno:|Marcha:|RESPUESTA DEL LLM"

# Start service process and capture output
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "pnpm"
$psi.Arguments = "run dev"
$psi.WorkingDirectory = $servicePath
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi

# Event handlers for output
$outputHandler = {
    if ($EventArgs.Data) {
        $line = $EventArgs.Data
        if ($line -match "📊|🎯|💬|⏳|🔊|✅|Velocidad:|RPM:|Acelerador:|Freno:|Marcha:|RESPUESTA DEL LLM") {
            Write-Host $line -ForegroundColor Cyan
        }
    }
}

$errorHandler = {
    if ($EventArgs.Data -and $EventArgs.Data -match "AIService|LLM") {
        Write-Host $EventArgs.Data -ForegroundColor Yellow
    }
}

Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action $outputHandler | Out-Null
Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action $errorHandler | Out-Null

$process.Start() | Out-Null
$process.BeginOutputReadLine()
$process.BeginErrorReadLine()

Write-Host "`n✅ Monitor activo. Presiona Ctrl+C para salir.`n" -ForegroundColor Green

$process.WaitForExit()
