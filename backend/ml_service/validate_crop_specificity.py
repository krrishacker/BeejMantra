"""
Validation script to test crop-specific behavior
Tests that model produces different outputs for different crops under same conditions
"""
import numpy as np
import tensorflow as tf
from model_architecture import prepare_features_for_inference, CROP_TYPES
from PIL import Image
import os

def create_test_image(size=(224, 224)):
    """Create a dummy test image"""
    img = Image.new('RGB', size, color=(100, 150, 100))  # Greenish image
    return np.array(img)

def validate_crop_specificity(model, test_image_path=None):
    """
    Test that model produces different outputs for different crops
    under identical conditions (same weather, soil, stage, image)
    
    Returns:
        dict with validation results
    """
    if model is None:
        return {'error': 'Model not loaded'}
    
    # Fixed test conditions
    test_weather = {'temp': 25.0, 'humidity': 60.0, 'rain': 10.0}
    test_soil = {'ph': 6.5, 'moisture': 30.0}
    test_stage = 'Vegetative'
    
    # Use test image or create dummy
    if test_image_path and os.path.exists(test_image_path):
        from tensorflow.keras.preprocessing import image as keras_image
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        img = Image.open(test_image_path)
        img = img.resize((224, 224))
        img_array = keras_image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
    else:
        # Create dummy image
        dummy_img = create_test_image()
        img_array = np.expand_dims(dummy_img, axis=0)
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        img_array = preprocess_input(img_array)
    
    # Test predictions for different crops
    crop_predictions = {}
    
    for crop_type in CROP_TYPES[:6]:  # Test first 6 crops
        features = prepare_features_for_inference(
            image_array=img_array,
            crop_type=crop_type,
            crop_stage=test_stage,
            weather=test_weather,
            soil=test_soil
        )
        
        # Get model inputs
        if len(model.inputs) > 1:
            predictions = model.predict(
                [
                    features['image_input'],
                    features['crop_type_input'],
                    features['crop_stage_input'],
                    features['weather_input'],
                    features['soil_input']
                ],
                verbose=0
            )
        else:
            predictions = model.predict(img_array, verbose=0)
        
        health_pred = predictions[0][0]
        crop_predictions[crop_type] = {
            'healthy': float(health_pred[0]),
            'moderate': float(health_pred[1]),
            'critical': float(health_pred[2]),
            'predicted_class': np.argmax(health_pred)
        }
    
    # Analyze variance across crops
    healthy_probs = [pred['healthy'] for pred in crop_predictions.values()]
    moderate_probs = [pred['moderate'] for pred in crop_predictions.values()]
    critical_probs = [pred['critical'] for pred in crop_predictions.values()]
    
    healthy_variance = np.var(healthy_probs)
    moderate_variance = np.var(moderate_probs)
    critical_variance = np.var(critical_probs)
    
    # Check if predictions differ
    unique_classes = len(set(pred['predicted_class'] for pred in crop_predictions.values()))
    
    # Validation criteria
    is_crop_specific = (
        healthy_variance > 0.01 or  # At least 1% variance in healthy probability
        moderate_variance > 0.01 or
        critical_variance > 0.01 or
        unique_classes > 1  # Different crops predict different classes
    )
    
    return {
        'crop_predictions': crop_predictions,
        'variance': {
            'healthy': healthy_variance,
            'moderate': moderate_variance,
            'critical': critical_variance
        },
        'unique_classes': unique_classes,
        'is_crop_specific': is_crop_specific,
        'test_conditions': {
            'weather': test_weather,
            'soil': test_soil,
            'stage': test_stage
        },
        'validation_passed': is_crop_specific
    }

if __name__ == '__main__':
    # Load model and run validation
    import sys
    sys.path.append(os.path.dirname(__file__))
    
    from app import load_model, model
    
    if load_model():
        print("Running crop-specificity validation...")
        results = validate_crop_specificity(model)
        
        print("\n=== Validation Results ===")
        print(f"Crop-specific behavior detected: {results['is_crop_specific']}")
        print(f"Variance in predictions: {results['variance']}")
        print(f"Unique predicted classes: {results['unique_classes']}")
        
        if not results['is_crop_specific']:
            print("\n⚠️  WARNING: Model is not learning crop-specific behavior!")
            print("   Crop predictions are too similar across different crops.")
            print("   Consider:")
            print("   1. Ensuring training data has crop-specific differences")
            print("   2. Increasing crop embedding dimension")
            print("   3. Adding more crop-conditioned feature interactions")
        else:
            print("\n✓ Model shows crop-specific behavior")
        
        print("\n=== Per-Crop Predictions ===")
        for crop, pred in results['crop_predictions'].items():
            print(f"{crop:15} - Healthy: {pred['healthy']:.3f}, Moderate: {pred['moderate']:.3f}, Critical: {pred['critical']:.3f}")
    else:
        print("Failed to load model")

