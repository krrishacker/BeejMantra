# ⚠️ IMPORTANT: How to Start ML Service

## ❌ DON'T use `npm start` here!

The ML service is **Python-based**, not Node.js!

## ✅ Correct Way to Start ML Service

### Option 1: Use PowerShell Script (Recommended)
```powershell
.\start_ml_service.ps1
```

### Option 2: Manual Start
```powershell
# Activate virtual environment
venv\Scripts\Activate.ps1

# Start the service
python app.py
```

### Option 3: Direct Python (if venv is activated)
```powershell
python app.py
```

## 📍 Two Different Services:

### 1. ML Service (Python) - Port 5001
**Location:** `backend/ml_service/`  
**Start:** `python app.py` or `.\start_ml_service.ps1`

### 2. Node.js Backend - Port 5000
**Location:** `backend/` (parent directory)  
**Start:** `npm start` or `.\start_backend.ps1`

## 🚀 Quick Start Guide

**Terminal 1 - ML Service (Python):**
```powershell
cd backend\ml_service
.\start_ml_service.ps1
```

**Terminal 2 - Node.js Backend:**
```powershell
cd backend
npm start
```

## ✅ You'll Know It's Working When:

**ML Service:**
- Shows: `Starting ML service on http://localhost:5001`
- Shows: `Model loaded successfully` or `Creating new model...`

**Node.js Backend:**
- Shows: `Weather API server running on port 5000`

