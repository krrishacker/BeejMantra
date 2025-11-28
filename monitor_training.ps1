# Training Progress Monitor
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = Get-Location }

$logFile = Join-Path $scriptDir "backend\training_full_log.txt"
$modelFile = Join-Path $scriptDir "backend\models\deepleaf_model.h5"

Write-Host "=== Training Monitor (Press Ctrl+C to stop) ===" -ForegroundColor Cyan
Write-Host ""

$checkCount = 0
while ($true) {
    $checkCount++
    Clear-Host
    Write-Host "=== Training Monitor - Check #$checkCount ===" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')"
    Write-Host ""
    
    # Check model
    if (Test-Path $modelFile) {
        $size = (Get-Item $modelFile).Length / 1MB
        Write-Host "SUCCESS! Model file found: $([math]::Round($size, 2)) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "Training completed! You can now use Disease Detection." -ForegroundColor Green
        break
    } else {
        Write-Host "Model file: Not ready yet" -ForegroundColor Yellow
    }
    
    # Check log
    if (Test-Path $logFile) {
        $log = Get-Content $logFile -ErrorAction SilentlyContinue
        if ($log) {
            Write-Host "Latest progress:" -ForegroundColor White
            $log | Select-String -Pattern "Dataset:|images|Class|Epoch|Saved|accuracy|loss" -CaseSensitive:$false | Select-Object -Last 10
            Write-Host ""
            Write-Host "Last 3 log lines:" -ForegroundColor Gray
            $log | Select-Object -Last 3
        }
    }
    
    # Check Python processes
    $pythonProcs = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddHours(-2) }
    if ($pythonProcs) {
        Write-Host ""
        Write-Host "Python processes running: $($pythonProcs.Count)" -ForegroundColor Green
        $pythonProcs | ForEach-Object { 
            $cpu = $_.CPU
            $mem = [math]::Round($_.WorkingSet / 1MB, 1)
            Write-Host "  PID $($_.Id): CPU=$cpu, Memory=${mem}MB, Started=$($_.StartTime.ToString('HH:mm:ss'))"
        }
    } else {
        Write-Host ""
        Write-Host "No recent Python processes found. Training may have stopped." -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Next check in 30 seconds... (Ctrl+C to stop)" -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

