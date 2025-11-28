param(
  [string]$Port = "5001"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
cd $scriptDir

if (-Not (Test-Path ..\venv)) {
  python -m venv ..\venv
}

& ..\venv\Scripts\Activate.ps1
pip install -r requirements.txt --upgrade

$modelsDir = Join-Path $scriptDir "..\models"
if (-Not (Test-Path $modelsDir)) {
  New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}
$env:DEEPLEAF_MODELS_DIR = (Resolve-Path $modelsDir).Path

python -m uvicorn fastapi_app:app --host 0.0.0.0 --port $Port


