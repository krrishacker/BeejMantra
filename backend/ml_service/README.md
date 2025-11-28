# Crop Image Analysis ML Service

This service provides ML-based crop health analysis using transfer learning with MobileNetV2.

## Setup

1. **Install Python dependencies:**
```bash
cd backend/ml_service
pip install -r requirements.txt
```

2. **Start the ML service:**
```bash
python app.py
```

The service will run on `http://localhost:5001`

## Training the Model

### Prepare Your Data

Organize your image dataset in the following structure:

```
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
python train_model.py
```

The trained model will be saved to `models/crop_health_model.h5`

## API Endpoints

### Health Check
```
GET /health
```

### Analyze Image
```
POST /analyze
Content-Type: multipart/form-data

Form data:
- image: (file) Crop image file
- cropType: (string) Type of crop (optional)
```

Response:
```json
{
  "success": true,
  "healthStatus": "healthy|moderate|critical",
  "confidence": 85.5,
  "issues": [
    {
      "type": "yellowing",
      "severity": "moderate",
      "description": "..."
    }
  ],
  "recommendations": [
    "Check for nitrogen deficiency...",
    "..."
  ],
  "detectedDiseases": [...],
  "analysis": {...}
}
```

## Integration

The Node.js backend automatically uses the ML service if available, otherwise falls back to rule-based analysis.

## Model Architecture

- **Base Model**: MobileNetV2 (pre-trained on ImageNet)
- **Input Size**: 224x224 RGB images
- **Outputs**:
  - Health Status: 3 classes (healthy, moderate, critical)
  - Disease Detection: 8 disease types (multi-label binary classification)

## Fine-tuning

To fine-tune with your own data:
1. Prepare your dataset as described above
2. Run `python train_model.py`
3. The model will be automatically saved and loaded by the service

