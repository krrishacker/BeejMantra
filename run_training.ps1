# Training Runner Script
$ErrorActionPreference = "Continue"
cd $PSScriptRoot

Write-Host "=== Training Script ===" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
Write-Host "Python: $pythonVersion"

# Check dependencies
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Yellow
python -c "import numpy; import tensorflow; import PIL; print('All dependencies OK')" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    python -m pip install numpy pillow tensorflow --quiet
}

# Ensure models directory exists
New-Item -ItemType Directory -Force -Path backend\models | Out-Null

Write-Host ""
Write-Host "Starting training..." -ForegroundColor Green
Write-Host "Dataset: Dataset"
Write-Host "Output: backend\models"
Write-Host "Epochs: 3"
Write-Host ""

# Run training and capture output
python deepleaf.py --data Dataset --out backend/models --epochs 3 --batch-size 32 --img-size 224 224 2>&1 | Tee-Object -FilePath backend\training_full_log.txt

Write-Host ""
if (Test-Path backend\models\deepleaf_model.h5) {
    Write-Host "Training completed! Model saved." -ForegroundColor Green
} else {
    Write-Host "Training may have failed. Check backend\training_full_log.txt" -ForegroundColor Red
}

