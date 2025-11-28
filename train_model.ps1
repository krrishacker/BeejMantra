cd $PSScriptRoot
if (Test-Path backend\venv\Scripts\Activate.ps1) {
    & backend\venv\Scripts\Activate.ps1
    python -m pip install numpy pillow tensorflow --quiet
} else {
    python -m pip install numpy pillow tensorflow --quiet
}

New-Item -ItemType Directory -Force -Path backend\models | Out-Null

Write-Output "Starting training with 3 epochs (this will take time)..."
python deepleaf.py --data Dataset --out backend/models --epochs 3 --batch-size 32 --img-size 224 224 2>&1 | Tee-Object -FilePath backend\training_log.txt

