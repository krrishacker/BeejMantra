# Quick Training Status Check
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
if (-not $scriptDir) { $scriptDir = Get-Location }

$logFile = Join-Path $scriptDir "backend\training_log.txt"
$fullLogFile = Join-Path $scriptDir "backend\training_full_log.txt"
$modelFile = Join-Path $scriptDir "backend\models\deepleaf_model.h5"
$classesFile = Join-Path $scriptDir "backend\models\deepleaf_classes.json"

Write-Host "=== Quick Training Status ===" -ForegroundColor Cyan
Write-Host ""

# Check model file
if (Test-Path $modelFile) {
    $modelSize = (Get-Item $modelFile).Length / 1MB
    $modelTime = (Get-Item $modelFile).LastWriteTime
    $sizeMB = [math]::Round($modelSize, 2)
    Write-Host "OK Model file: EXISTS ($sizeMB MB)" -ForegroundColor Green
    Write-Host "  Last modified: $modelTime"
} else {
    Write-Host "X Model file: NOT FOUND" -ForegroundColor Yellow
}

# Check classes file
if (Test-Path $classesFile) {
    Write-Host "OK Classes file: EXISTS" -ForegroundColor Green
} else {
    Write-Host "X Classes file: NOT FOUND" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Training Progress Summary ===" -ForegroundColor Cyan

$log = $null
if (Test-Path $fullLogFile) {
    $log = Get-Content $fullLogFile -ErrorAction SilentlyContinue
} elseif (Test-Path $logFile) {
    $log = Get-Content $logFile -ErrorAction SilentlyContinue
}

if ($log) {
    if ($log) {
        # Extract key information
        $datasetInfo = $log | Select-String -Pattern "Dataset:|Number of images|Class names" | Select-Object -Last 3
        $epochInfo = $log | Select-String -Pattern "Epoch|epoch" | Select-Object -Last 5
        $savedInfo = $log | Select-String -Pattern "Saved model|Saved class" | Select-Object -Last 2
        
        if ($datasetInfo) {
            Write-Host "Dataset Info:" -ForegroundColor White
            $datasetInfo | ForEach-Object { Write-Host "  $_" }
        }
        
        if ($epochInfo) {
            Write-Host ""
            Write-Host "Training Progress:" -ForegroundColor White
            $epochInfo | ForEach-Object { Write-Host "  $_" }
        }
        
        if ($savedInfo) {
            Write-Host ""
            Write-Host "Saved Files:" -ForegroundColor White
            $savedInfo | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
        }
        
        Write-Host ""
        Write-Host "--- Latest Log Entry ---" -ForegroundColor Gray
        $log | Select-Object -Last 1
    } else {
        Write-Host "Log file is empty." -ForegroundColor Yellow
    }
} else {
    Write-Host "Log file not found." -ForegroundColor Yellow
}

Write-Host ""
