"""
Multi-modal ML model architecture for crop health prediction
Combines image features (CNN) with tabular features (crop type, stage, weather, soil)
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Input, Dense, Dropout, GlobalAveragePooling2D, Embedding, Concatenate, BatchNormalization
import numpy as np

# Crop types for embedding
CROP_TYPES = [
    'Paddy', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 
    'Chickpea', 'Mustard', 'Groundnut', 'Potato', 'Onion', 'Tomato'
]

# Crop stages for encoding
CROP_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting / Grain Filling']

def create_multi_modal_model():
    """
    Create a multi-modal model that combines:
    - Image features (from CNN)
    - Crop type (learnable embedding)
    - Crop stage (one-hot encoded)
    - Weather features (temperature, humidity, rainfall)
    - Soil features (pH, moisture)
    """
    
    # ========== IMAGE BRANCH ==========
    # Image input: 224x224x3 RGB images
    image_input = Input(shape=(224, 224, 3), name='image_input')
    
    # Pre-trained MobileNetV2 for image feature extraction
    base_model = MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False  # Freeze initially
    
    # Extract image features
    image_features = base_model(image_input, training=False)
    image_features = GlobalAveragePooling2D()(image_features)
    image_features = Dense(128, activation='relu', name='image_dense')(image_features)
    image_features = BatchNormalization()(image_features)
    image_features = Dropout(0.3)(image_features)
    
    # ========== TABULAR FEATURES BRANCH ==========
    # Strengthened to ensure crop-specific learning
    
    # Crop type: Learnable embedding (NOT numeric label) - INCREASED DIMENSION
    crop_type_input = Input(shape=(1,), name='crop_type_input', dtype='int32')
    crop_type_embedding = Embedding(
        input_dim=len(CROP_TYPES),
        output_dim=32,  # INCREASED from 16 to 32 for stronger crop signal
        name='crop_type_embedding'
    )(crop_type_input)
    crop_type_embedding = tf.squeeze(crop_type_embedding, axis=1)  # Remove dimension
    # Add dense layer to strengthen crop embedding contribution
    crop_type_embedding = Dense(32, activation='relu', name='crop_type_dense')(crop_type_embedding)
    crop_type_embedding = BatchNormalization()(crop_type_embedding)
    
    # Crop stage: One-hot encoding
    crop_stage_input = Input(shape=(len(CROP_STAGES),), name='crop_stage_input')
    
    # Weather features: temperature, humidity, rainfall
    weather_input = Input(shape=(3,), name='weather_input')  # [temp, humidity, rain]
    weather_dense = Dense(32, activation='relu', name='weather_dense')(weather_input)
    weather_dense = BatchNormalization()(weather_dense)
    weather_dense = Dropout(0.2)(weather_dense)
    
    # Soil features: pH, moisture
    soil_input = Input(shape=(2,), name='soil_input')  # [pH, moisture]
    soil_dense = Dense(16, activation='relu', name='soil_dense')(soil_input)
    soil_dense = BatchNormalization()(soil_dense)
    
    # ========== CROP-CONDITIONED FEATURE INTERACTION ==========
    # Force model to learn crop-specific responses to weather/soil
    # Combine crop embedding with weather and soil BEFORE concatenation
    crop_weather_interaction = Concatenate(name='crop_weather_interaction')([crop_type_embedding, weather_dense])
    crop_weather_interaction = Dense(32, activation='relu', name='crop_weather_dense')(crop_weather_interaction)
    crop_weather_interaction = BatchNormalization()(crop_weather_interaction)
    
    crop_soil_interaction = Concatenate(name='crop_soil_interaction')([crop_type_embedding, soil_dense])
    crop_soil_interaction = Dense(24, activation='relu', name='crop_soil_dense')(crop_soil_interaction)
    crop_soil_interaction = BatchNormalization()(crop_soil_interaction)
    
    # ========== CONCATENATE ALL FEATURES ==========
    # Combine all feature branches (including crop-conditioned interactions)
    combined_features = Concatenate(name='feature_concat')([
        image_features,              # 128 dim
        crop_type_embedding,         # 32 dim (increased)
        crop_stage_input,            # 4 dim
        crop_weather_interaction,    # 32 dim (crop-conditioned weather response)
        crop_soil_interaction,       # 24 dim (crop-conditioned soil response)
    ])
    # Total: 128 + 32 + 4 + 32 + 24 = 220 dimensions
    # Crop features now contribute 32 + 32 + 24 = 88 dims (40% of total)
    
    # ========== FUSION LAYERS ==========
    # Allow model to learn interactions between features
    fused = Dense(256, activation='relu', name='fusion_layer_1')(combined_features)
    fused = BatchNormalization()(fused)
    fused = Dropout(0.4)(fused)
    
    fused = Dense(128, activation='relu', name='fusion_layer_2')(fused)
    fused = BatchNormalization()(fused)
    fused = Dropout(0.3)(fused)
    
    # ========== OUTPUT LAYERS ==========
    # Health status: 3 classes (healthy, moderate, critical)
    health_output = Dense(3, activation='softmax', name='health_status')(fused)
    
    # Disease detection: 8 disease types (multi-label binary)
    disease_output = Dense(8, activation='sigmoid', name='disease_detection')(fused)
    
    # ========== AUXILIARY OUTPUT FOR CROP-SPECIFIC LEARNING ==========
    # Auxiliary loss: Predict crop-conditioned stress score
    # This forces the model to learn crop-specific responses to conditions
    crop_stress_output = Dense(1, activation='sigmoid', name='crop_stress_auxiliary')(
        Concatenate()([crop_type_embedding, weather_dense, soil_dense])
    )
    
    # ========== CREATE MODEL ==========
    model = keras.Model(
        inputs=[
            image_input,
            crop_type_input,
            crop_stage_input,
            weather_input,
            soil_input
        ],
        outputs=[health_output, disease_output, crop_stress_output],
        name='crop_health_multi_modal'
    )
    
    # Compile model with weighted losses
    # Higher weight on auxiliary loss to force crop-specific learning
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss={
            'health_status': 'categorical_crossentropy',
            'disease_detection': 'binary_crossentropy',
            'crop_stress_auxiliary': 'binary_crossentropy'  # Auxiliary loss
        },
        loss_weights={
            'health_status': 1.0,
            'disease_detection': 1.0,
            'crop_stress_auxiliary': 0.3  # Weight for auxiliary loss
        },
        metrics={
            'health_status': 'accuracy',
            'disease_detection': 'binary_accuracy',
            'crop_stress_auxiliary': 'mse'
        }
    )
    
    return model, base_model

def get_crop_type_index(crop_type: str) -> int:
    """Convert crop type string to index for embedding"""
    try:
        return CROP_TYPES.index(crop_type)
    except ValueError:
        return 0  # Default to first crop if not found

def encode_crop_stage(crop_stage: str) -> np.ndarray:
    """One-hot encode crop stage"""
    encoding = np.zeros(len(CROP_STAGES))
    try:
        idx = CROP_STAGES.index(crop_stage)
        encoding[idx] = 1.0
    except ValueError:
        # If stage not found, use uniform distribution
        encoding.fill(1.0 / len(CROP_STAGES))
    return encoding

def prepare_features_for_inference(
    image_array: np.ndarray,
    crop_type: str,
    crop_stage: str = None,
    weather: dict = None,
    soil: dict = None
) -> dict:
    """
    Prepare all features for model inference
    
    Args:
        image_array: Preprocessed image array (224, 224, 3)
        crop_type: Crop type string
        crop_stage: Crop stage string (optional)
        weather: Dict with 'temp', 'humidity', 'rain' (optional)
        soil: Dict with 'ph', 'moisture' (optional)
    
    Returns:
        Dictionary with all model inputs
    """
    # Crop type embedding index
    crop_type_idx = np.array([[get_crop_type_index(crop_type)]], dtype='int32')
    
    # Crop stage one-hot encoding
    if crop_stage:
        crop_stage_encoded = encode_crop_stage(crop_stage)
    else:
        crop_stage_encoded = np.zeros(len(CROP_STAGES))
    crop_stage_encoded = np.expand_dims(crop_stage_encoded, axis=0)
    
    # Weather features (normalized)
    if weather:
        temp = weather.get('temp', 25.0) / 50.0  # Normalize to 0-1 (assuming max 50°C)
        humidity = weather.get('humidity', 50.0) / 100.0  # Normalize to 0-1
        rain = min(weather.get('rain', 0.0) / 200.0, 1.0)  # Normalize to 0-1 (assuming max 200mm)
        weather_features = np.array([[temp, humidity, rain]], dtype='float32')
    else:
        weather_features = np.array([[0.5, 0.5, 0.0]], dtype='float32')  # Default values
    
    # Soil features (normalized)
    if soil:
        ph = (soil.get('ph', 6.5) - 5.0) / 3.0  # Normalize pH (5-8 range) to 0-1
        moisture = soil.get('moisture', 30.0) / 100.0  # Normalize to 0-1
        soil_features = np.array([[ph, moisture]], dtype='float32')
    else:
        soil_features = np.array([[0.5, 0.3]], dtype='float32')  # Default values
    
    return {
        'image_input': image_array,
        'crop_type_input': crop_type_idx,
        'crop_stage_input': crop_stage_encoded,
        'weather_input': weather_features,
        'soil_input': soil_features
    }

