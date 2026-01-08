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


def _extract_color_features(image_path: str) -> Dict[str, float]:
    """
    Compute simple, lighting‑robust color features used both for
    (a) symptom validation and (b) healthy‑crop detection.

    NOTE: These are deliberately conservative to avoid false positives.
    """
    img = Image.open(image_path).convert("RGB").resize((128, 128))
    arr = np.asarray(img, dtype=np.float32) / 255.0

    mean_rgb = arr.mean(axis=(0, 1))
    std_rgb = arr.std(axis=(0, 1))

    brightness = float(mean_rgb.mean())
    green_dominance = float(mean_rgb[1] - (mean_rgb[0] + mean_rgb[2]) / 2)
    yellow_tint = float(mean_rgb[0] + mean_rgb[1] - mean_rgb[2] * 1.4)
    dryness = float((1 - mean_rgb[1]) + mean_rgb[0]) / 2

    return {
        "mean_r": float(mean_rgb[0]),
        "mean_g": float(mean_rgb[1]),
        "mean_b": float(mean_rgb[2]),
        "std_rgb": float(std_rgb.mean()),
        "brightness": brightness,
        "green_dominance": green_dominance,
        "yellow_tint": yellow_tint,
        "dryness": dryness,
    }


def _detect_symptoms(features: Dict[str, float]) -> Tuple[Dict[str, bool], float]:
    """
    Derive coarse symptom flags from color features.

    This is used as a *gate* on CNN predictions so that we NEVER
    output a high‑confidence disease when the leaf looks visually healthy.
    """
    brightness = features["brightness"]
    green_dom = features["green_dominance"]
    yellow_tint = features["yellow_tint"]
    dryness = features["dryness"]
    std_rgb = features["std_rgb"]

    # Symptom heuristics – intentionally conservative.
    discoloration = std_rgb > 0.20 and brightness < 0.85
    chlorosis = yellow_tint > 0.16 and green_dom < 0.06
    necrotic_spots = std_rgb > 0.26 and brightness < 0.7
    wilting = dryness > 0.55 and brightness < 0.55
    abnormal_texture = std_rgb > 0.23 and abs(green_dom) < 0.10

    symptoms = {
        "discoloration": discoloration,
        "chlorosis": chlorosis,
        "necrotic_spots": necrotic_spots,
        "wilting": wilting,
        "abnormal_texture": abnormal_texture,
    }

    # Health score: start high, subtract penalties for symptoms / stress.
    health_score = 92.0
    if discoloration:
        health_score -= 12
    if chlorosis:
        health_score -= 18
    if necrotic_spots:
        health_score -= 18
    if wilting:
        health_score -= 15
    if abnormal_texture:
        health_score -= 10

    # Penalise strong yellowing / dryness even if symptom flags are borderline.
    health_score -= max(0.0, (yellow_tint - 0.10) * 80.0)
    health_score -= max(0.0, (dryness - 0.5) * 50.0)

    health_score = max(40.0, min(97.0, health_score))
    return symptoms, health_score


def predict_disease(image_path: str) -> Dict:
    """
    Two‑stage inference pipeline:

    Step 1 (Binary health gate):
      - Decide **Healthy vs Unhealthy** using CNN logits + color‑based symptom checks.

    Step 2 (Disease classification, only if Unhealthy):
      - If the leaf is classified as Unhealthy, run disease‑level interpretation
        with strict confidence and symptom gating to avoid false positives.

    This makes “Healthy Crop” a first‑class outcome instead of a fallback.
    """
    try:
        # ---- STEP 1: HEALTHY vs UNHEALTHY PRE‑CLASSIFICATION ----
        # Compute color features + symptom flags for gating.
        color_features = _extract_color_features(image_path)
        symptoms, health_score = _detect_symptoms(color_features)
        has_any_symptom = any(symptoms.values())

        model = _ensure_model_loaded()
        x = preprocess_image(image_path, target_size=(224, 224))  # Match training size
        probs = model.predict(x, verbose=0)[0]  # verbose=0 to suppress output
        
        idx_to_label = _ensure_class_map_loaded()
        
        # Get top 3 predictions (model space)
        top3_indices = np.argsort(probs)[-3:][::-1]
        top3_probs = probs[top3_indices]

        # Track if model already has an explicit healthy class.
        healthy_idx = None
        healthy_conf = 0.0
        for idx, prob in zip(top3_indices, top3_probs):
            label = idx_to_label.get(int(idx), "")
            if "healthy" in label.lower():
                healthy_idx = int(idx)
                healthy_conf = float(prob) * 100.0
                break

        # Model's top prediction
        top_idx = int(np.argmax(probs))
        top_conf = float(probs[top_idx]) * 100.0
        raw_label = idx_to_label.get(top_idx, f"Class_{top_idx}")

        # ---- Binary health decision ----
        # A soft “health logit”: combine health_score (0‑100) with green dominance
        # and explicit healthy‑class probability (if present).
        healthy_score_model = healthy_conf if healthy_idx is not None else 0.0
        healthy_score_combined = health_score + max(0.0, color_features["green_dominance"] * 90.0)
        healthy_score_combined = (0.6 * healthy_score_combined) + (0.4 * healthy_score_model)

        # A rough “unhealthy score”: driven by top disease confidence + symptom burden.
        symptom_count = sum(1 for v in symptoms.values() if v)
        unhealthy_score = top_conf + symptom_count * 8.0

        is_unhealthy = (unhealthy_score >= healthy_score_combined) and (
            has_any_symptom or top_conf >= 70.0
        )

        # ---- STEP 1 OUTPUT: If classified as HEALTHY, short‑circuit here ----
        if not is_unhealthy:
            # Confidence of health is high when unhealthy_score is low
            # and visual features look normal.
            yellow_penalty = max(0.0, (color_features["yellow_tint"] - 0.10) * 80.0)
            conf_healthy = healthy_score_combined - yellow_penalty
            conf_healthy = max(60.0, min(97.0, conf_healthy))
            primary_crop = _derive_crop_from_label(
                idx_to_label.get(healthy_idx, "") if healthy_idx is not None else raw_label
            )
            return {
                "healthStatus": "healthy",
                "prediction": "Healthy Crop",
                "disease": "Healthy Crop",
                "confidence": round(conf_healthy, 2),
                "modelVersion": MODEL_VERSION,
                "cropType": primary_crop,
                "note": "No visible disease or nutrient deficiency detected",
                "cause": "No disease patterns or stress symptoms detected in the image.",
                "suggestions": "Continue regular irrigation, balanced fertiliser and field scouting.",
                "prevention": "Maintain crop rotation, monitor pests and keep field weed‑free.",
            }

        # ---- STEP 2: DISEASE CLASSIFICATION (ONLY IF UNHEALTHY) ----
        cls_idx = top_idx
        confidence = top_conf

        display_name, crop_type, disease_key, is_healthy = _humanize_label(raw_label)

        # Very low confidence still falls back to heuristic model.
        if confidence < LOW_CONF_THRESHOLD:
            return fallback_prediction(image_path, reason=f"low_conf({confidence:.1f})", default_crop=crop_type)

        # Disease confidence capping rule:
        # don't allow >80% unless multiple symptom flags are present.
        if not is_healthy and confidence > 80.0 and symptom_count < 2:
            confidence = 80.0

        rec = _recommendations_for_label(disease_key, is_healthy)
        return {
            "healthStatus": "unhealthy",
            "prediction": display_name if not is_healthy else "Healthy Crop",
            "disease": display_name,
            "confidence": round(confidence, 2),
            "modelVersion": MODEL_VERSION,
            "cropType": crop_type,
            "note": "" if not is_healthy else "No visible disease or nutrient deficiency detected",
            "cause": rec["cause"],
            "suggestions": rec["solution"],
            "prevention": rec["prevention"],
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
        # Explicit healthy‑crop recommendations – surfaced both from CNN
        # predictions and our heuristic fallback.
        return {
            "cause": "No disease detected - Plant is healthy.",
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

    # If the leaf is overall green and reasonably bright with very low yellowing,
    # treat it as healthy instead of forcing a disease label.
    if (
        green_dominance > 0.04
        and yellow_tint < 0.08
        and dryness < 0.55
        and 0.30 < brightness < 0.85
    ):
        # When the leaf looks normal green under reasonable lighting,
        # we explicitly classify it as a healthy crop instead of
        # forcing a synthetic disease label.
        disease = "Healthy Crop"
        library = {
            "cause": "No clear disease patterns detected – foliage appears healthy and well nourished.",
            "solution": "Maintain your current irrigation and nutrition schedule; continue routine scouting.",
            "prevention": "Keep following good agronomy practices: crop rotation, balanced fertiliser and timely pest monitoring.",
        }
        base_conf = 82
    elif std_rgb.mean() > 0.20:
        disease = "Leaf Spot"
        library = FALLBACK_LIBRARY[disease]
        base_conf = 65
    elif yellow_tint > 0.18:
        disease = "Nutrient Deficiency"
        library = FALLBACK_LIBRARY[disease]
        base_conf = 67
    elif dryness > 0.55 and brightness < 0.45:
        disease = "Leaf Blight"
        library = FALLBACK_LIBRARY[disease]
        base_conf = 66
    elif green_dominance < -0.08 and mean_rgb[0] > 0.4:
        disease = "Rust"
        library = FALLBACK_LIBRARY[disease]
        base_conf = 66
    else:
        disease = "Powdery Mildew"
        library = FALLBACK_LIBRARY[disease]
        base_conf = 64

    confidence = base_conf + int((abs(green_dominance) + std_rgb.mean() + rng_boost) * 20)
    confidence = max(60, min(confidence, 93))

    return {
        "prediction": disease,
        "disease": disease,
        "confidence": confidence,
        "modelVersion": f"heuristic_fallback ({reason or 'no_model'})",
        "cropType": default_crop,
        "cause": library["cause"],
        "suggestions": library["solution"],
        "prevention": library["prevention"],
    }


