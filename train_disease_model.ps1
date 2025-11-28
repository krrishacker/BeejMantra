# Script to train the disease detection model
# This will train the model using the Dataset folder and save it to backend/models/

Write-Host "=== Disease Detection Model Training ===" -ForegroundColor Green
Write-Host ""

# Check if Dataset exists
if (-not (Test-Path "Dataset")) {
    Write-Host "ERROR: Dataset folder not found!" -ForegroundColor Red
    Write-Host "Please ensure the Dataset folder exists with disease images organized by folder." -ForegroundColor Yellow
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found! Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if TensorFlow is installed
Write-Host "Checking TensorFlow installation..." -ForegroundColor Yellow
$tfCheck = python -c "import tensorflow; print('OK')" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: TensorFlow not installed!" -ForegroundColor Red
    Write-Host "Installing TensorFlow (this may take a few minutes)..." -ForegroundColor Yellow
    python -m pip install tensorflow --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install TensorFlow. Please install manually: pip install tensorflow" -ForegroundColor Red
        exit 1
    }
    Write-Host "TensorFlow installed successfully" -ForegroundColor Green
} else {
    Write-Host "TensorFlow is already installed" -ForegroundColor Green
}

# Check if scipy is installed (required for ImageDataGenerator)
Write-Host "Checking scipy installation..." -ForegroundColor Yellow
$scipyCheck = python -c "import scipy; print('OK')" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing scipy (required for image processing)..." -ForegroundColor Yellow
    python -m pip install scipy --quiet
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install scipy. Please install manually: pip install scipy" -ForegroundColor Red
        exit 1
    }
    Write-Host "scipy installed successfully" -ForegroundColor Green
} else {
    Write-Host "scipy is already installed" -ForegroundColor Green
}

# Create models directory if it doesn't exist
$modelsDir = "backend\models"
if (-not (Test-Path $modelsDir)) {
    Write-Host "Creating models directory: $modelsDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}

Write-Host ""
Write-Host "Starting model training..." -ForegroundColor Green
Write-Host "Dataset: Dataset\" -ForegroundColor Cyan
Write-Host "Output: $modelsDir\" -ForegroundColor Cyan
Write-Host "Epochs: 10 (this may take 30-60 minutes depending on your hardware)" -ForegroundColor Cyan
Write-Host ""

# Run training
python deepleaf.py --data ./Dataset --out ./backend/models --epochs 10 --img-size 224 224

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Training Completed Successfully! ===" -ForegroundColor Green
    Write-Host "Model saved to: $modelsDir\deepleaf_model.h5" -ForegroundColor Green
    Write-Host "Class mapping saved to: $modelsDir\deepleaf_classes.json" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now use the disease detection feature!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=== Training Failed! ===" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
    exit 1
}

