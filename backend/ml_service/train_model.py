"""
Training script for crop health classification model
This script can be used to fine-tune the model with actual image data
"""
import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8
EPOCHS = 50
LEARNING_RATE = 0.001

# Data directories
TRAIN_DIR = 'data/train'
VALIDATION_DIR = 'data/validation'
TEST_DIR = 'data/test'

# Output
MODEL_DIR = 'models'
MODEL_PATH = os.path.join(MODEL_DIR, 'crop_health_model.h5')

def create_model():
    """Create model with transfer learning"""
    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model initially
    base_model.trainable = False
    
    # Build model
    inputs = keras.Input(shape=(*IMAGE_SIZE, 3))
    x = base_model(inputs, training=False)
    x = keras.layers.GlobalAveragePooling2D()(x)
    x = keras.layers.Dropout(0.2)(x)
    
    # Health status output (3 classes: healthy, moderate, critical)
    health_output = keras.layers.Dense(3, activation='softmax', name='health_status')(x)
    
    # Disease detection output (multi-label: 8 disease types)
    disease_output = keras.layers.Dense(8, activation='sigmoid', name='disease_detection')(x)
    
    model = keras.Model(inputs=inputs, outputs=[health_output, disease_output])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss={
            'health_status': 'categorical_crossentropy',
            'disease_detection': 'binary_crossentropy'
        },
        metrics={
            'health_status': 'accuracy',
            'disease_detection': 'binary_accuracy'
        }
    )
    
    return model, base_model

def prepare_data_generators():
    """Prepare data generators for training"""
    # Data augmentation for training
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        zoom_range=0.2,
        brightness_range=[0.8, 1.2]
    )
    
    # Only rescaling for validation and test
    val_test_datagen = ImageDataGenerator(rescale=1./255)
    
    # Training generator
    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )
    
    # Validation generator
    validation_generator = val_test_datagen.flow_from_directory(
        VALIDATION_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical'
    )
    
    # Test generator
    test_generator = val_test_datagen.flow_from_directory(
        TEST_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        shuffle=False
    )
    
    return train_generator, validation_generator, test_generator

def train_model():
    """Train the model"""
    logger.info("Creating model...")
    model, base_model = create_model()
    
    # Check if data directories exist
    if not os.path.exists(TRAIN_DIR):
        logger.warning(f"Training directory {TRAIN_DIR} not found.")
        logger.info("Creating sample directory structure for reference...")
        logger.info("Please organize your image data as follows:")
        logger.info(f"  {TRAIN_DIR}/healthy/")
        logger.info(f"  {TRAIN_DIR}/moderate/")
        logger.info(f"  {TRAIN_DIR}/critical/")
        logger.info(f"  {VALIDATION_DIR}/healthy/")
        logger.info(f"  {VALIDATION_DIR}/moderate/")
        logger.info(f"  {VALIDATION_DIR}/critical/")
        logger.info("Saving untrained model for now...")
        os.makedirs(MODEL_DIR, exist_ok=True)
        model.save(MODEL_PATH)
        logger.info(f"Model saved to {MODEL_PATH}")
        return
    
    logger.info("Preparing data generators...")
    train_gen, val_gen, test_gen = prepare_data_generators()
    
    # Create callbacks
    callbacks = [
        ModelCheckpoint(
            MODEL_PATH,
            monitor='val_loss',
            save_best_only=True,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        )
    ]
    
    # Train model
    logger.info("Starting training...")
    history = model.fit(
        train_gen,
        epochs=EPOCHS,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1
    )
    
    # Fine-tune: Unfreeze base model and train with lower learning rate
    logger.info("Fine-tuning base model...")
    base_model.trainable = True
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE / 10),
        loss={
            'health_status': 'categorical_crossentropy',
            'disease_detection': 'binary_crossentropy'
        },
        metrics={
            'health_status': 'accuracy',
            'disease_detection': 'binary_accuracy'
        }
    )
    
    history_fine = model.fit(
        train_gen,
        epochs=EPOCHS // 2,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate on test set
    logger.info("Evaluating on test set...")
    test_results = model.evaluate(test_gen, verbose=1)
    logger.info(f"Test results: {test_results}")
    
    logger.info(f"Training completed. Model saved to {MODEL_PATH}")

if __name__ == '__main__':
    train_model()

