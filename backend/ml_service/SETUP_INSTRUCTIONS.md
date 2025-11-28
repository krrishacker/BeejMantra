# Crop Health ML Service - Setup Instructions

## Quick Start

### 1. Install Python
Make sure you have Python 3.8 or higher installed:
```bash
python --version
```

### 2. Setup (Windows)
```bash
cd backend/ml_service
setup.bat
```

This will:
- Create a virtual environment
- Install all required dependencies
- Set up the ML service

### 3. Start the ML Service
```bash
start_ml_service.bat
```

Or manually:
```bash
venv\Scripts\activate.bat
python app.py
```

The service will start on `http://localhost:5001`

### 4. Verify Setup
Open another terminal and test:
```bash
curl http://localhost:5001/health
```

Should return: `{"status":"OK","model_loaded":true}`

## Training Your Own Model

### Prepare Image Data

Organize your crop images in this structure:

```
backend/ml_service/
  data/
    train/
      healthy/
        image1.jpg
        image2.jpg
        ...
      moderate/
        image1.jpg
        ...
      critical/
        image1.jpg
        ...
    validation/
      healthy/
        ...
      moderate/
        ...
      critical/
        ...
    test/
      healthy/
        ...
      moderate/
        ...
      critical/
        ...
```

### Run Training

```bash
cd backend/ml_service
venv\Scripts\activate.bat
python train_model.py
```

The trained model will be saved to `models/crop_health_model.h5`

## How It Works

1. **ML Service (Python/Flask)**: Runs on port 5001, handles ML model inference
2. **Node.js Backend**: Calls ML service when available, falls back to rule-based analysis if ML service is down
3. **Model**: Uses MobileNetV2 (transfer learning) for crop health classification

## Integration

The Node.js backend automatically:
- Tries to use ML service first (if running)
- Falls back to rule-based analysis if ML service unavailable
- No changes needed to frontend!

## Troubleshooting

### ML Service won't start
- Check Python version: `python --version` (need 3.8+)
- Reinstall dependencies: `pip install -r requirements.txt`
- Check port 5001 is not in use

### Model not loading
- First run will create a new model automatically
- Model will be saved to `models/crop_health_model.h5`
- Check the `models/` directory exists

### Training issues
- Ensure image data is organized correctly (see structure above)
- Check image formats (JPG, PNG supported)
- Minimum recommended: 100 images per class for training

## Next Steps

1. Start the ML service: `start_ml_service.bat`
2. Start the Node.js backend: `npm start` (in backend folder)
3. Test image upload in the frontend
4. (Optional) Train with your own data using `train_model.py`

