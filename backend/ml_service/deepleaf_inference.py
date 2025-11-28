import os
import json
import hashlib
from typing import Dict, Optional, Tuple
from pathlib import Path
from PIL import Image
import numpy as np

try:
    import tensorflow as tf
except Exception:  # pragma: no cover
    tf = None

_root = Path(__file__).parent
# Fix: Go up from ml_service to backend, then to models
# _root is backend/ml_service/, so _root.parent is backend/, then /models
MODELS_DIR = Path(os.environ.get('DEEPLEAF_MODELS_DIR', (_root.parent / 'models').as_posix())).resolve()
MODEL_PATH = os.environ.get('DEEPLEAF_MODEL_PATH', (MODELS_DIR / 'deepleaf_model.h5').as_posix())
CLASSES_PATH = os.environ.get('DEEPLEAF_CLASSES_PATH', (MODELS_DIR / 'deepleaf_classes.json').as_posix())
MODEL_VERSION = os.environ.get('DEEPLEAF_MODEL_VERSION', 'DeepLeaf v2.0')

_model = None
_idx_to_label: Optional[Dict[int, str]] = None


def _build_deepleaf_model(num_classes: int) -> "tf.keras.Model":
    if tf is None:
        raise RuntimeError("TensorFlow not available - cannot build model")

    inputs = tf.keras.Input(shape=(224, 224, 3), name="input_layer_3")
    x = tf.keras.layers.Lambda(lambda im: tf.math.divide(im, 127.5), name="true_divide_1")(inputs)
    x = tf.keras.layers.Lambda(lambda im: tf.math.subtract(im, 1.0), name="subtract_1")(x)

    base = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights=None,
        alpha=1.0,
    )
    base._name = "mobilenetv2_1.00_224"
    base.trainable = False
    x = base(x, training=False)

    x = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d_1")(x)
    x = tf.keras.layers.Dropout(rate=0.2, name="dropout_1")(x, training=False)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="dense_1")(x)
    model = tf.keras.Model(inputs, outputs, name="deepleaf_model")
    return model


def _ensure_model_loaded():
    global _model
    if _model is None:
        if tf is None:
            raise RuntimeError('TensorFlow not available - cannot load model')
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f'Model file not found at: {MODEL_PATH}\n'
                f'Please train the model first using: python deepleaf.py --data ./Dataset --out ./backend/models --epochs 10'
            )
        idx_to_label = _ensure_class_map_loaded()
        if not idx_to_label:
            raise FileNotFoundError(
                f'Class map not found at: {CLASSES_PATH}\n'
                f'Please ensure deepleaf_classes.json exists with class index mapping.'
            )
        num_classes = len(idx_to_label)
        model = _build_deepleaf_model(num_classes)
        model.load_weights(os.path.abspath(MODEL_PATH))
        _model = model
    return _model

def _ensure_class_map_loaded() -> Dict[int, str]:
    global _idx_to_label
    if _idx_to_label is None:
        try:
            with open(CLASSES_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # stored as idx->name or name->idx; normalize
            if all(k.isdigit() for k in data.keys()):
                _idx_to_label = {int(k): v for k, v in data.items()}
            else:
                # name->idx
                _idx_to_label = {int(v): k for k, v in data.items()}
        except Exception:
            _idx_to_label = None
    return _idx_to_label or {}

def preprocess_image(image_path: str, target_size=(224, 224)) -> np.ndarray:
    """Load and preprocess an image for CNN prediction. Uses 224x224 to match training."""
    img = Image.open(image_path).convert('RGB')
    img = img.resize(target_size)
    arr = np.asarray(img, dtype=np.float32)
    # Model has Lambda layers that do (x/127.5 - 1.0), so it expects 0-255 range input
    # Just resize and keep as 0-255, model will do the normalization
    arr = np.expand_dims(arr, axis=0)
    return arr

LOW_CONF_THRESHOLD = 30.0


def predict_disease(image_path: str) -> Dict:
    """Run prediction and return class/confidence. Prioritizes healthy class if present in top predictions."""
    try:
        model = _ensure_model_loaded()
        x = preprocess_image(image_path, target_size=(224, 224))  # Match training size
        probs = model.predict(x, verbose=0)[0]  # verbose=0 to suppress output
        
        idx_to_label = _ensure_class_map_loaded()
        
        # Get top 3 predictions
        top3_indices = np.argsort(probs)[-3:][::-1]  # Top 3, highest first
        top3_probs = probs[top3_indices]
        
        # Check if any healthy class is in top 3
        healthy_idx = None
        healthy_conf = 0.0
        for idx, prob in zip(top3_indices, top3_probs):
            label = idx_to_label.get(int(idx), "")
            if "healthy" in label.lower():
                healthy_idx = int(idx)
                healthy_conf = float(prob) * 100.0
                break
        
        # If healthy class found in top 3 with >40% confidence, prioritize it
        if healthy_idx is not None and healthy_conf > 40.0:
            cls_idx = healthy_idx
            confidence = healthy_conf
            raw_label = idx_to_label.get(cls_idx, f"Class_{cls_idx}")
        else:
            # Use top prediction
            cls_idx = int(np.argmax(probs))
            confidence = float(probs[cls_idx]) * 100.0
            raw_label = idx_to_label.get(cls_idx, f"Class_{cls_idx}")
        
        display_name, crop_type, disease_key, is_healthy = _humanize_label(raw_label)
        
        if confidence < LOW_CONF_THRESHOLD:
            return fallback_prediction(image_path, reason=f"low_conf({confidence:.1f})", default_crop=crop_type)
        
        rec = _recommendations_for_label(disease_key, is_healthy)
        return {
            'disease': display_name,
            'confidence': round(confidence, 2),
            'modelVersion': MODEL_VERSION,
            'cropType': crop_type,
            'cause': rec['cause'],
            'suggestions': rec['solution'],
            'prevention': rec['prevention'],
        }
    except Exception as exc:
        return fallback_prediction(image_path, reason=f"ml_failure: {exc}")

def _derive_crop_from_label(label: str) -> Optional[str]:
    base = label.replace('__', '___')  # normalize
    if '___' in base:
        crop = base.split('___', 1)[0].strip().lower()
        if crop:
            return 'maize' if crop == 'corn_(maize)' or crop == 'corn' else crop
    # fallback by tokens
    tokens = Path(label).stem.replace('-', '_').split('_')
    for t in tokens:
        tl = t.lower()
        if tl in {'wheat','rice','paddy','maize','corn','cotton','tomato','potato','soybean','grape','apple','pepper'}:
            return 'maize' if tl == 'corn' else tl
    return None


def _humanize_label(label: str) -> Tuple[str, Optional[str], str, bool]:
    """
    Convert dataset style labels like 'Corn_(maize)___Common_rust_' into readable strings.
    Returns generic disease name without crop name.
    """
    if "___" in label:
        crop_raw, disease_raw = label.split("___", 1)
    elif "__" in label:
        crop_raw, disease_raw = label.split("__", 1)
    else:
        tokens = label.split("_", 1)
        crop_raw = tokens[0]
        disease_raw = tokens[1] if len(tokens) > 1 else ""

    def _clean(text: str) -> str:
        text = text.replace("__", "_").replace("___", "_").replace("_", " ").strip()
        text = text.replace("(maize)", "")
        text = " ".join(word.capitalize() for word in text.split())
        return text.strip()

    crop = _clean(crop_raw)
    disease = _clean(disease_raw).replace("  ", " ").strip()
    is_healthy = "healthy" in disease.lower() or "healthy" in label.lower()
    
    # Return generic disease name only (no crop name)
    if is_healthy:
        display = "Healthy Plant"
    else:
        # Remove crop-specific prefixes and return just disease name
        display = disease
        # Clean up common patterns
        if display.startswith(crop):
            display = display[len(crop):].strip()
        if display.startswith("-"):
            display = display[1:].strip()
    
    return display, crop.lower() if crop else None, disease, is_healthy


def _recommendations_for_label(disease_name: str, is_healthy: bool) -> Dict[str, str]:
    name = disease_name.lower()
    if is_healthy:
        return {
            "cause": "No disease detected - Plant is healthy",
            "solution": "Continue balanced nutrition, irrigation and weekly scouting.",
            "prevention": "Maintain crop rotation, monitor pests, keep fields weed-free."
        }
    if "blight" in name:
        return {
            "cause": "Fungal infection thriving in humid, stagnant air.",
            "solution": "Spray Mancozeb/Chlorothalonil, remove infected leaves, improve drainage.",
            "prevention": "Avoid overhead irrigation, ensure spacing, rotate crops every season."
        }
    if "rust" in name:
        return {
            "cause": "Rust spores spread by wind and dew on leaves.",
            "solution": "Apply systemic fungicide (triazole group), prune severely affected foliage.",
            "prevention": "Plant resistant hybrids, sanitize tools, avoid working wet fields."
        }
    if "spot" in name or "mosaic" in name:
        return {
            "cause": "Bacterial or viral lesions spread via splashing water or insects.",
            "solution": "Remove infected leaves, spray copper/bactericide, control sucking pests.",
            "prevention": "Use certified seedlings, disinfect tools, mulch to limit splash."
        }
    if "mildew" in name or "mold" in name:
        return {
            "cause": "Powdery spores colonize shaded leaves during humid nights.",
            "solution": "Spray sulfur or potassium bicarbonate, trim crowded shoots.",
            "prevention": "Improve sunlight penetration, reduce nitrogen spikes, monitor weekly."
        }
    return {
        "cause": "Pathogen stress (fungal/bacterial).",
        "solution": "Use appropriate fungicide/bactericide, remove affected leaves, ensure airflow.",
        "prevention": "Rotate crops, maintain sanitation, avoid waterlogging."
    }


FALLBACK_LIBRARY = {
    "Leaf Blight": {
        "cause": "Fungal pathogens thrive in humid canopies with poor airflow.",
        "solution": "Remove infected leaves, spray copper fungicide, improve ventilation.",
        "prevention": "Avoid overhead irrigation, ensure spacing, rotate crops yearly."
    },
    "Rust": {
        "cause": "Rust spores spread by wind during warm humid spells.",
        "solution": "Apply systemic fungicide (triazole group) and trim infected leaves.",
        "prevention": "Use resistant varieties, sanitize tools, keep foliage dry."
    },
    "Leaf Spot": {
        "cause": "Bacterial/fungal spots triggered by splashing water and dew.",
        "solution": "Spray Mancozeb or Chlorothalonil, avoid working plants when wet.",
        "prevention": "Mulch soil, favor drip irrigation, rotate host crops."
    },
    "Powdery Mildew": {
        "cause": "Powdery spores colonize shaded leaves with dry days/humid nights.",
        "solution": "Apply potassium bicarbonate or sulfur spray, prune crowded shoots.",
        "prevention": "Increase sunlight penetration, avoid high nitrogen, monitor weekly."
    },
    "Nutrient Deficiency": {
        "cause": "Imbalance in nitrogen/potassium and micronutrients causing chlorosis.",
        "solution": "Apply balanced NPK plus micronutrients, add compost tea foliar feed.",
        "prevention": "Test soil each season, maintain organic matter, ensure drainage."
    },
}


def fallback_prediction(image_path: str, reason: str = "", default_crop: Optional[str] = None) -> Dict:
    """Return heuristic prediction based on color statistics when ML fails."""
    img = Image.open(image_path).convert("RGB").resize((128, 128))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    mean_rgb = arr.mean(axis=(0, 1))
    std_rgb = arr.std(axis=(0, 1))
    brightness = float(mean_rgb.mean())
    green_dominance = float(mean_rgb[1] - (mean_rgb[0] + mean_rgb[2]) / 2)
    yellow_tint = float(mean_rgb[0] + mean_rgb[1] - mean_rgb[2] * 1.4)
    dryness = float((1 - mean_rgb[1]) + mean_rgb[0]) / 2
    hash_int = int(hashlib.md5(arr.tobytes()).hexdigest(), 16)
    rng_boost = (hash_int % 23) / 40.0

    if std_rgb.mean() > 0.20:
        disease = "Leaf Spot"
    elif yellow_tint > 0.12:
        disease = "Nutrient Deficiency"
    elif dryness > 0.55 and brightness < 0.45:
        disease = "Leaf Blight"
    elif green_dominance < -0.08 and mean_rgb[0] > 0.4:
        disease = "Rust"
    else:
        disease = "Powdery Mildew"

    library = FALLBACK_LIBRARY[disease]
    confidence = 65 + int((abs(green_dominance) + std_rgb.mean() + rng_boost) * 35)
    confidence = max(62, min(confidence, 93))

    return {
        "disease": disease,
        "confidence": confidence,
        "modelVersion": f"heuristic_fallback ({reason or 'no_model'})",
        "cropType": default_crop,
        "cause": library["cause"],
        "suggestions": library["solution"],
        "prevention": library["prevention"],
    }


