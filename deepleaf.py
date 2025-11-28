from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image


try:
    import tensorflow as tf
    from tensorflow.keras import layers, models
    from tensorflow.keras.applications import MobileNetV2
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    TF_AVAILABLE = True
except ImportError as e:
    TF_AVAILABLE = False
    print(f"Warning: TensorFlow import failed: {e}")

# Check for scipy (required by ImageDataGenerator)
try:
    import scipy
except ImportError:
    print("ERROR: scipy is required for ImageDataGenerator but not installed.")
    print("Please install it: pip install scipy")
    raise SystemExit(1)


DEFAULT_IMG_SIZE = (224, 224)
SUPPORTED_EXTS = {".jpg", ".jpeg", ".png"}


def list_images(root: Path) -> List[Path]:
    return [p for p in root.rglob("*") if p.suffix.lower() in SUPPORTED_EXTS]


def canonical_class_name(folder_name: str) -> str:
    # Strip trailing severity like ___25 if present (but keep crop___disease format)
    # Example: "Tomato___Leaf_blight___25" -> "Tomato___Leaf_blight"
    # Example: "Tomato___Leaf_blight" -> "Tomato___Leaf_blight" (no change)
    base = folder_name
    # Only strip if there are 3+ parts (crop___disease___severity)
    parts = base.split("___")
    if len(parts) > 2:
        # Keep only crop___disease, drop severity
        base = "___".join(parts[:2])
    return base


def get_class_mapping(dataset_root: Path) -> Dict[int, str]:
    """Scan dataset to build class name to index mapping."""
    class_name_set: Dict[str, int] = {}
    image_paths = list_images(dataset_root)
    
    if not image_paths:
        raise FileNotFoundError(f"No images found under: {dataset_root}")

    for img_path in image_paths:
        label_folder = img_path.parent.name
        cls_name = canonical_class_name(label_folder)
        if cls_name not in class_name_set:
            class_name_set[cls_name] = len(class_name_set)
    
    idx_to_name = {idx: name for name, idx in class_name_set.items()}
    return idx_to_name


def build_model(num_classes: int, img_size: Tuple[int, int]) -> "tf.keras.Model":
    if not TF_AVAILABLE:
        raise RuntimeError("TensorFlow is required to train the model.")

    h, w = img_size
    input_shape = (h, w, 3)
    try:
        base = MobileNetV2(input_shape=input_shape, include_top=False, weights="imagenet")
        base.trainable = False
        inputs = layers.Input(shape=input_shape)
        x = preprocess_input(inputs)
        x = base(x, training=False)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(0.2)(x)
        outputs = layers.Dense(num_classes, activation="softmax")(x)
        model = models.Model(inputs, outputs)
    except Exception:
        # Fallback small CNN
        model = models.Sequential([
            layers.Input(shape=input_shape),
            layers.Conv2D(32, 3, activation="relu"),
            layers.MaxPooling2D(),
            layers.Conv2D(64, 3, activation="relu"),
            layers.MaxPooling2D(),
            layers.Conv2D(128, 3, activation="relu"),
            layers.GlobalAveragePooling2D(),
            layers.Dense(256, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation="softmax"),
        ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(),
        metrics=["accuracy"],
    )
    return model


def train(
    dataset_root: Path,
    out_dir: Path,
    img_size: Tuple[int, int] = DEFAULT_IMG_SIZE,
    epochs: int = 5,
    batch_size: int = 8,
) -> None:
    """Train model using memory-efficient generators."""
    if not TF_AVAILABLE:
        raise RuntimeError("TensorFlow is required to train the model.")
    
    # Build model (will update num_classes after generator creates mapping)
    # Start with a placeholder, will rebuild if needed
    model = build_model(num_classes=10, img_size=img_size)  # Placeholder
    
    # Use ImageDataGenerator for memory-efficient loading
    # This loads images on-the-fly instead of loading all into memory
    train_datagen = ImageDataGenerator(
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        zoom_range=0.2,
        brightness_range=[0.8, 1.2],
        validation_split=0.2  # 20% for validation
    )
    
    val_datagen = ImageDataGenerator(validation_split=0.2)
    
    print("Creating data generators (this may take a moment)...")
    # Note: flow_from_directory expects subdirectories with class names
    # Our dataset structure matches this (e.g., Dataset/Tomato___Leaf_blight/)
    train_generator = train_datagen.flow_from_directory(
        str(dataset_root),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='sparse',  # For integer labels
        subset='training',
        shuffle=True,
        seed=42
    )
    
    val_generator = val_datagen.flow_from_directory(
        str(dataset_root),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='sparse',
        subset='validation',
        shuffle=False,
        seed=42
    )
    
    # Get class mapping from generator (folder_name -> generator_index)
    # The generator assigns indices 0, 1, 2, ... to folders alphabetically
    generator_class_indices = train_generator.class_indices
    num_classes = len(generator_class_indices)
    
    print(f"Found {num_classes} classes in dataset")
    
    # Create idx_to_name mapping: generator_index -> canonical_name
    # We'll use canonical names for consistency
    idx_to_name = {}
    for folder_name, gen_idx in sorted(generator_class_indices.items(), key=lambda x: x[1]):
        canonical = canonical_class_name(folder_name)
        idx_to_name[gen_idx] = canonical
    
    # Rebuild model with correct number of classes
    print(f"Building model for {num_classes} classes...")
    model = build_model(num_classes=num_classes, img_size=img_size)
    
    print(f"Training with {train_generator.samples} training samples, {val_generator.samples} validation samples")
    print(f"Batch size: {batch_size}, Epochs: {epochs}")

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            patience=5, 
            restore_best_weights=True, 
            monitor="val_accuracy",
            verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            str(out_dir / "deepleaf_model_checkpoint.h5"),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1
        ),
    ]

    steps_per_epoch = max(1, train_generator.samples // batch_size)
    validation_steps = max(1, val_generator.samples // batch_size)
    
    print("\nStarting training...")
    model.fit(
        train_generator,
        steps_per_epoch=steps_per_epoch,
        validation_data=val_generator,
        validation_steps=validation_steps,
        epochs=epochs,
        callbacks=callbacks,
        verbose=2,
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "deepleaf_model.h5"
    classes_path = out_dir / "deepleaf_classes.json"
    model.save(model_path.as_posix())
    with classes_path.open("w", encoding="utf-8") as f:
        json.dump(idx_to_name, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Saved model to: {model_path}")
    print(f"✓ Saved class map to: {classes_path}")
    print(f"✓ Model trained on {num_classes} classes")


def main():
    parser = argparse.ArgumentParser(description="Train DeepLeaf model")
    parser.add_argument("--data", type=str, default=str(Path("Dataset")), help="Dataset root folder")
    parser.add_argument("--out", type=str, default=str(Path("backend")/"models"), help="Output models folder")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--img-size", nargs=2, type=int, default=list(DEFAULT_IMG_SIZE))
    args = parser.parse_args()

    data_root = Path(args.data).expanduser().resolve()
    out_dir = Path(args.out).expanduser().resolve()
    img_size = (int(args.img_size[0]), int(args.img_size[1]))

    if not TF_AVAILABLE:
        raise SystemExit("TensorFlow is required to run this training script. Please install tensorflow.")

    print(f"Dataset: {data_root}")
    print(f"Output:  {out_dir}")
    print(f"Image size: {img_size}")
    train(data_root, out_dir, img_size=img_size, epochs=args.epochs, batch_size=args.batch_size)


if __name__ == "__main__":
    main()
