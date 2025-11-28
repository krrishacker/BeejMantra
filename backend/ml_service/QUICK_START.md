# Quick Start Guide

## ✅ Setup Complete!

All dependencies have been installed successfully. Now start the ML service:

## Start ML Service

In PowerShell (from `backend/ml_service` directory):

```powershell
.\start_ml_service.ps1
```

Or using batch file:
```cmd
.\start_ml_service.bat
```

Or manually:
```powershell
venv\Scripts\Activate.ps1
python app.py
```

## Verify It's Working

Open another terminal and test:
```powershell
curl http://localhost:5001/health
```

Should return: `{"status":"OK","model_loaded":true}`

## What Happens Next

1. **First Run**: The service will create a new ML model automatically (this takes ~30 seconds)
2. **Model Created**: Saved to `models/crop_health_model.h5`
3. **Service Ready**: You'll see "Starting ML service on http://localhost:5001"
4. **Node.js Backend**: Will automatically use the ML service when available

## Integration

The Node.js backend (port 5000) will:
- ✅ Try ML service first (if running on port 5001)
- ✅ Fall back to rule-based analysis if ML service unavailable
- ✅ No frontend changes needed!

## Testing

1. Start ML service: `.\start_ml_service.ps1`
2. Start Node.js backend: `cd .. && npm start`
3. Upload an image in the frontend Crop Monitoring page
4. Check the analysis results!

## Troubleshooting

### Port 5001 already in use
- Find and close the process using port 5001
- Or change port in `app.py` (line with `app.run(port=5001)`)

### Model creation takes time
- First run creates the model (~30 seconds)
- Subsequent runs load the saved model (instant)

### Import errors
- Make sure virtual environment is activated: `venv\Scripts\Activate.ps1`
- Reinstall: `pip install -r requirements.txt`

