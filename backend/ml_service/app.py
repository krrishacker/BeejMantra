"""
Flask API for Crop Image Analysis using ML Model
"""
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from PIL import Image
import io
import base64
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.preprocessing import image
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logger.warning("TensorFlow not available. ML model will not work. Install with: pip install tensorflow")

app = Flask(__name__)
CORS(app)

# Global model variable
model = None
CLASS_NAMES = ['healthy', 'moderate', 'critical']
DISEASE_TYPES = [
    'yellowing', 'browning', 'dark_spots', 'pest_damage', 
    'low_vigor', 'fungal_infection', 'bacterial_spot', 'leaf_curl'
]

def load_model():
    """Load the pre-trained model or create a new one"""
    global model
    
    if not TENSORFLOW_AVAILABLE:
        logger.error("TensorFlow not available. Cannot load model.")
        return False
    
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'crop_health_model.h5')
    
    if os.path.exists(model_path):
        try:
            logger.info(f"Loading model from {model_path}")
            model = keras.models.load_model(model_path)
            logger.info("Model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    else:
        logger.info("Model file not found, creating new model with transfer learning")
        return create_model()

def create_model():
    """Create a new model using transfer learning"""
    global model
    
    if not TENSORFLOW_AVAILABLE:
        logger.error("TensorFlow not available. Cannot create model.")
        return False
    
    try:
        # Load pre-trained MobileNetV2 (trained on ImageNet)
        base_model = MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Add custom classification head
        inputs = keras.Input(shape=(224, 224, 3))
        x = base_model(inputs, training=False)
        x = keras.layers.GlobalAveragePooling2D()(x)
        x = keras.layers.Dropout(0.2)(x)
        
        # Health status classification (healthy, moderate, critical)
        health_output = keras.layers.Dense(3, activation='softmax', name='health_status')(x)
        
        # Disease detection (multi-label)
        disease_output = keras.layers.Dense(len(DISEASE_TYPES), activation='sigmoid', name='disease_detection')(x)
        
        model = keras.Model(inputs=inputs, outputs=[health_output, disease_output])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss={
                'health_status': 'categorical_crossentropy',
                'disease_detection': 'binary_crossentropy'
            },
            metrics={
                'health_status': 'accuracy',
                'disease_detection': 'binary_accuracy'
            }
        )
        
        # Save the model
        os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'crop_health_model.h5')
        model.save(model_path)
        logger.info(f"New model created and saved to {model_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create model: {e}")
        return False

def preprocess_image(img):
    """Preprocess image for model input"""
    try:
        # Resize to 224x224 (MobileNet input size)
        img = img.resize((224, 224))
        
        # Convert to array
        img_array = image.img_to_array(img)
        
        # Expand dimensions for batch
        img_array = np.expand_dims(img_array, axis=0)
        
        # Preprocess for MobileNet
        img_array = preprocess_input(img_array)
        
        return img_array
    except Exception as e:
        logger.error(f"Image preprocessing error: {e}")
        raise

def analyze_image(image_path):
    """Analyze crop image using ML model"""
    global model
    
    if model is None:
        return None
    
    try:
        # Load and preprocess image
        img = Image.open(image_path)
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img_array = preprocess_image(img)
        
        # Predict
        predictions = model.predict(img_array, verbose=0)
        
        health_pred = predictions[0][0]  # Health status probabilities
        disease_pred = predictions[1][0]  # Disease detection probabilities
        
        # Get health status
        health_idx = np.argmax(health_pred)
        health_status = CLASS_NAMES[health_idx]
        confidence = float(health_pred[health_idx] * 100)
        
        # Get detected diseases (threshold > 0.5)
        detected_diseases = []
        for i, disease in enumerate(DISEASE_TYPES):
            if disease_pred[i] > 0.5:
                detected_diseases.append({
                    'type': disease,
                    'confidence': float(disease_pred[i] * 100),
                    'severity': 'high' if disease_pred[i] > 0.7 else 'moderate'
                })
        
        # Generate issues and recommendations
        issues = []
        recommendations = []
        
        if health_status == 'healthy':
            issues.append({
                'type': 'healthy',
                'severity': 'none',
                'description': 'Leaves appear healthy with good green coloration. No visible disease symptoms or pest damage detected.'
            })
            recommendations.append('Continue current care practices.')
            recommendations.append('Regular monitoring recommended to maintain crop health.')
        else:
            if detected_diseases:
                for disease in detected_diseases:
                    if disease['type'] == 'yellowing':
                        issues.append({
                            'type': 'yellowing',
                            'severity': disease['severity'],
                            'description': f'Leaf yellowing detected ({disease["confidence"]:.1f}% confidence). May indicate nutrient deficiency, water stress, or early disease symptoms.'
                        })
                        recommendations.append('Check for nitrogen deficiency. Apply balanced fertilizer if needed.')
                        recommendations.append('Monitor watering schedule. Yellowing can indicate over or under-watering.')
                    
                    elif disease['type'] == 'browning':
                        issues.append({
                            'type': 'browning',
                            'severity': disease['severity'],
                            'description': f'Brown spots/necrosis detected ({disease["confidence"]:.1f}% confidence). Indicates tissue death, possibly due to disease or severe stress.'
                        })
                        recommendations.append('Immediate action required: Apply fungicide if fungal disease is suspected.')
                        recommendations.append('Remove affected leaves to prevent spread.')
                    
                    elif disease['type'] == 'dark_spots':
                        issues.append({
                            'type': 'dark_spots',
                            'severity': disease['severity'],
                            'description': f'Dark spots/lesions detected ({disease["confidence"]:.1f}% confidence). Possible disease infection (bacterial or fungal).'
                        })
                        recommendations.append('Apply appropriate fungicide or bactericide based on disease type.')
                        recommendations.append('Improve air circulation and reduce humidity if possible.')
                    
                    elif disease['type'] == 'pest_damage':
                        issues.append({
                            'type': 'pest_damage',
                            'severity': disease['severity'],
                            'description': f'Pest damage patterns detected ({disease["confidence"]:.1f}% confidence). Holes, irregular shapes, or feeding damage visible.'
                        })
                        recommendations.append('Apply neem oil or appropriate pesticide to control pests.')
                        recommendations.append('Remove visible pests manually if safe to do so.')
                        recommendations.append('Monitor for pest eggs or larvae on underside of leaves.')
            
            if health_status == 'critical':
                issues.append({
                    'type': 'critical_condition',
                    'severity': 'high',
                    'description': 'Critical health condition detected. Immediate intervention required.'
                })
                recommendations.append('Consult with agricultural expert immediately.')
                recommendations.append('Consider isolating affected plants to prevent spread.')
        
        return {
            'healthStatus': health_status,
            'confidence': round(confidence, 2),
            'issues': issues,
            'recommendations': list(set(recommendations)),  # Remove duplicates
            'detectedDiseases': detected_diseases,
            'analysis': {
                'healthProbabilities': {
                    'healthy': float(health_pred[0] * 100),
                    'moderate': float(health_pred[1] * 100),
                    'critical': float(health_pred[2] * 100)
                }
            }
        }
    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'model_loaded': model is not None
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze crop image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        crop_type = request.form.get('cropType', 'Unknown')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        try:
            # Analyze image
            result = analyze_image(tmp_path)
            
            if result is None:
                return jsonify({'error': 'Model not loaded'}), 500
            
            result['cropType'] = crop_type
            result['success'] = True
            
            return jsonify(result)
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Load model on startup
    if load_model():
        logger.info("Starting ML service...")
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        logger.error("Failed to load model. Exiting.")
        sys.exit(1)

