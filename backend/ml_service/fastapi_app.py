import os
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form
from fastapi import status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from .deepleaf_inference import predict_disease, fallback_prediction, MODEL_VERSION
except ImportError:
    from deepleaf_inference import predict_disease, fallback_prediction, MODEL_VERSION
from pathlib import Path
import subprocess
import threading

MONGO_URL = os.environ.get('MONGO_URL')
mongo_client = None
reports_collection = None
if MONGO_URL:
    try:
        from pymongo import MongoClient
        mongo_client = MongoClient(MONGO_URL)
        db = mongo_client.get_default_database() if '/' in MONGO_URL.split('@')[-1] else mongo_client['farmer']
        reports_collection = db['disease_reports']
    except Exception:
        mongo_client = None
        reports_collection = None

app = FastAPI(title="DeepLeaf Disease Detection API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictResponse(BaseModel):
    disease: str
    confidence: float
    suggestions: str
    cause: str
    prevention: str
    modelVersion: str
    cropType: Optional[str] = None
    alert: bool = False
    timestamp: str


@app.get("/health")
def health():
    return {"status": "ok", "modelVersion": MODEL_VERSION}


@app.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...), cropType: Optional[str] = Form(None), language: Optional[str] = Form(None)):
    # Save to temp file
    suffix = os.path.splitext(image.filename or "upload.jpg")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        pred = predict_disease(tmp_path)

        # Map disease to appropriate suggestions based on disease type
        disease_name = pred["disease"].lower()
        is_healthy = "healthy" in disease_name

        cause = pred.get("cause")
        solution = pred.get("suggestions")
        prevention = pred.get("prevention")

        # Override only if not already set from ML model
        if not cause or (is_healthy and "fungal" in cause.lower()):
            if is_healthy:
                cause = "No disease detected - Plant is healthy"
                solution = "Continue current practices; maintain balanced nutrition and irrigation; monitor regularly"
                prevention = "Maintain good agricultural practices, regular monitoring, proper nutrition, crop rotation"
            elif "blight" in disease_name:
                cause = "Fungal infection due to high humidity and poor air circulation"
                solution = "Spray Mancozeb 75 WP or Chlorothalonil; ensure proper drainage; improve air flow"
                prevention = "Use disease-free seeds, rotate crops, monitor humidity, avoid overhead irrigation"
            elif "rot" in disease_name or "rust" in disease_name:
                cause = "Fungal pathogen infection, often spread by water or wind"
                solution = "Apply fungicide (Copper-based or systemic fungicide); remove infected parts; improve spacing"
                prevention = "Plant resistant varieties, maintain proper spacing, avoid water on leaves, clean tools"
            elif "spot" in disease_name or "mosaic" in disease_name:
                cause = "Viral or bacterial infection, often spread by insects or contaminated tools"
                solution = "Remove infected plants; apply appropriate bactericide/viricide; control insect vectors"
                prevention = "Use certified disease-free seeds, control pests, sanitize tools, avoid working when wet"
            else:
                cause = "Fungal or bacterial infection"
                solution = "Apply appropriate fungicide/bactericide; improve growing conditions; consult agricultural expert"
                prevention = "Use disease-free seeds, rotate crops, monitor regularly, maintain proper spacing"
        
        severe = float(pred["confidence"]) >= 90.0

        inferred_crop = pred.get("cropType") or _guess_crop_from_filename(image.filename or "")
        doc = {
            "timestamp": datetime.utcnow(),
            "cropType": cropType or inferred_crop,
            "disease": pred["disease"],
            "confidence": pred["confidence"],
            "modelVersion": pred["modelVersion"],
            "alert": severe,
        }
        if reports_collection is not None:
            try:
                reports_collection.insert_one(doc)
            except Exception:
                pass

        return PredictResponse(
            disease=pred["disease"],
            confidence=pred["confidence"],
            suggestions=solution,
            cause=cause,
            prevention=prevention,
            modelVersion=pred["modelVersion"],
            cropType=doc["cropType"],
            alert=severe,
            timestamp=datetime.utcnow().isoformat(),
        )
    except FileNotFoundError:
        inferred_crop = _guess_crop_from_filename(image.filename or "")
        fb = fallback_prediction(tmp_path, reason="model_missing")
        crop_name = cropType or inferred_crop or fb.get("cropType")
        alert_flag = fb["confidence"] >= 85
        return PredictResponse(
            disease=fb["disease"],
            confidence=fb["confidence"],
            suggestions=fb["suggestions"],
            cause=fb["cause"],
            prevention=fb["prevention"],
            modelVersion=fb["modelVersion"],
            cropType=crop_name,
            alert=alert_flag,
            timestamp=datetime.utcnow().isoformat(),
        )
    except Exception as e:
        inferred_crop = _guess_crop_from_filename(image.filename or "")
        fb = fallback_prediction(tmp_path, reason=str(e))
        crop_name = cropType or inferred_crop or fb.get("cropType")
        alert_flag = fb["confidence"] >= 85
        return PredictResponse(
            disease=fb["disease"],
            confidence=fb["confidence"],
            suggestions=fb["suggestions"] + f" (fallback due to: {str(e)})",
            cause=fb["cause"],
            prevention=fb["prevention"],
            modelVersion=fb["modelVersion"],
            cropType=crop_name,
            alert=alert_flag,
            timestamp=datetime.utcnow().isoformat(),
        )
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


def _guess_crop_from_filename(name: str) -> Optional[str]:
    base = os.path.splitext(os.path.basename(name))[0]
    # simple heuristics
    tokens = base.replace('-', '_').split('_')
    for t in tokens:
        t_low = t.lower()
        if t_low in {"wheat", "rice", "paddy", "maize", "corn", "cotton", "tomato", "potato", "soybean", "grape"}:
            return "paddy" if t_low == "rice" else ("maize" if t_low == "corn" else t_low)
    return None


# --- Training orchestration (optional) ---
_training_lock = threading.Lock()
_training_thread: Optional[threading.Thread] = None


@app.post("/train")
def train(dataset_dir: Optional[str] = None, epochs: int = 5, img_h: int = 224, img_w: int = 224):
    """Launch training in background using deepleaf.py. Returns status string."""
    global _training_thread
    if _training_lock.locked():
        return {"status": "training_already_running"}

    root = Path(__file__).resolve().parents[2]  # project root (..\..)
    default_dataset = root / 'Dataset'
    dataset = Path(dataset_dir or default_dataset)
    models_dir = root / 'backend' / 'models'

    def _run():
        with _training_lock:
            cmd = [
                "python", str(root / 'deepleaf.py'),
                "--data", str(dataset),
                "--out", str(models_dir),
                "--epochs", str(epochs),
                "--img-size", str(img_h), str(img_w),
            ]
            try:
                subprocess.run(cmd, check=True)
            except Exception:
                pass

    _training_thread = threading.Thread(target=_run, daemon=True)
    _training_thread.start()
    return {"status": "training_started", "dataset": str(dataset)}


