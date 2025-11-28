# Training Progress Monitor Script
$logFile = "backend\training_log.txt"
$modelFile = "backend\models\deepleaf_model.h5"
$classesFile = "backend\models\deepleaf_classes.json"

Write-Output "=== Training Progress Monitor ==="
Write-Output "Press Ctrl+C to stop monitoring"
Write-Output ""

$iteration = 0
while ($true) {
    $iteration++
    Clear-Host
    Write-Output "=== Training Progress Monitor (Check #$iteration) ==="
    Write-Output "Time: $(Get-Date -Format 'HH:mm:ss')"
    Write-Output ""
    
    # Check model file
    if (Test-Path $modelFile) {
        $modelSize = (Get-Item $modelFile).Length / 1MB
        $sizeMB = [math]::Round($modelSize, 2)
        Write-Output "OK Model file EXISTS: $sizeMB MB" -ForegroundColor Green
    } else {
        Write-Output "X Model file NOT found yet" -ForegroundColor Yellow
    }
    
    # Check classes file
    if (Test-Path $classesFile) {
        Write-Output "OK Classes file EXISTS" -ForegroundColor Green
    } else {
        Write-Output "X Classes file NOT found yet" -ForegroundColor Yellow
    }
    
    Write-Output ""
    Write-Output "=== Latest Training Log (last 15 lines) ==="
    
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -ErrorAction SilentlyContinue
        if ($logContent) {
            # Show relevant lines
            $logContent | Select-String -Pattern "Dataset:|Number of images|Class names|Epoch|Saved model|Saved class|Training|Validation|accuracy|loss" -CaseSensitive:$false | Select-Object -Last 10
            Write-Output ""
            Write-Output "--- Raw Log (last 5 lines) ---"
            $logContent | Select-Object -Last 5
        } else {
            Write-Output "Log file is empty or still initializing..."
        }
    } else {
        Write-Output "Log file not found. Training may not have started yet."
    }
    
    Write-Output ""
    Write-Output "Next check in 30 seconds... (Press Ctrl+C to stop)"
    Start-Sleep -Seconds 30
}

