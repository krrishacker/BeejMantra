# Start Node.js Backend
Write-Host "Starting Node.js Backend..." -ForegroundColor Green

# Check if port 5000 is in use
$portCheck = netstat -ano | findstr :5000
if ($portCheck) {
    Write-Host "Port 5000 is already in use!" -ForegroundColor Yellow
    Write-Host "Attempting to find and kill the process..." -ForegroundColor Yellow
    
    $process = netstat -ano | findstr :5000 | Select-Object -First 1
    if ($process) {
        $pid = ($process -split '\s+')[-1]
        Write-Host "Killing process PID: $pid" -ForegroundColor Yellow
        taskkill /PID $pid /F 2>$null
        Start-Sleep -Seconds 2
    }
}

# Check if we're in the right directory
if (-not (Test-Path "server.js")) {
    Write-Host "ERROR: server.js not found. Make sure you're in the backend directory." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting backend server on http://localhost:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npm start

