
import pandas as pd
import json
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score
)


# --------------------------------------------------
# 1. Paths
# --------------------------------------------------

DATA_DIR = Path("ml/data")

MODEL_DIR = Path("ml/models")
RESULTS_DIR = Path("ml/results")

MODEL_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# 2. Configuration
# --------------------------------------------------

MAX_ROWS_PER_FILE = 25_000
RANDOM_STATE = 42


# --------------------------------------------------
# 3. Load a controlled sample from each file
# --------------------------------------------------

def load_dataset():
    csv_files = sorted(DATA_DIR.glob("*_processed.csv"))

    frames = []

    print(f"Found {len(csv_files)} processed files.\n")

    for file in csv_files:
        print(f"Loading: {file.name}")

        df = pd.read_csv(file)

        if len(df) > MAX_ROWS_PER_FILE:
            df = df.sample(
                n=MAX_ROWS_PER_FILE,
                random_state=RANDOM_STATE
            )

        frames.append(df)

        print(f"Rows selected: {len(df):,}")

    dataset = pd.concat(
        frames,
        ignore_index=True
    )

    print("\n" + "=" * 70)
    print(f"Total rows selected: {len(dataset):,}")

    return dataset


# --------------------------------------------------
# 4. Load dataset
# --------------------------------------------------

df = load_dataset()


# --------------------------------------------------
# 5. Separate features and target
# --------------------------------------------------

X = df.drop(columns=["target"])
y = df["target"]

print("\nFeature shape:", X.shape)

print("\nTarget distribution:")
print(y.value_counts())


# --------------------------------------------------
# 6. Train/Test Split
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=RANDOM_STATE,
    stratify=y
)

print("\n" + "=" * 70)
print("TRAIN / TEST SPLIT")

print("Training rows:", len(X_train))
print("Testing rows :", len(X_test))


# --------------------------------------------------
# 7. Feature Scaling
# --------------------------------------------------

print("\nScaling features...")

scaler = StandardScaler()

X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


# --------------------------------------------------
# 8. Train Logistic Regression
# --------------------------------------------------

print("\nTraining Logistic Regression...")

model = LogisticRegression(
    class_weight="balanced",
    max_iter=500,
    solver="lbfgs",
    random_state=RANDOM_STATE
)

model.fit(
    X_train_scaled,
    y_train
)


# --------------------------------------------------
# 9. Generate Predictions
# --------------------------------------------------

print("\nGenerating predictions...")

y_pred = model.predict(X_test_scaled)


# --------------------------------------------------
# 10. Evaluate Model
# --------------------------------------------------

print("\n" + "=" * 70)
print("MODEL RESULTS")

accuracy = accuracy_score(
    y_test,
    y_pred
)

report = classification_report(
    y_test,
    y_pred,
    target_names=[
        "BENIGN",
        "ATTACK"
    ],
    output_dict=True
)

cm = confusion_matrix(
    y_test,
    y_pred
)

print(f"\nAccuracy: {accuracy:.4f}")

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "BENIGN",
            "ATTACK"
        ]
    )
)

print("\nConfusion Matrix:")
print(cm)


# --------------------------------------------------
# 11. Save Model and Scaler
# --------------------------------------------------

model_path = MODEL_DIR / "logistic_regression_baseline.pkl"
scaler_path = MODEL_DIR / "logistic_regression_scaler.pkl"

joblib.dump(
    model,
    model_path
)

joblib.dump(
    scaler,
    scaler_path
)


# --------------------------------------------------
# 12. Prepare Metrics
# --------------------------------------------------

metrics = {
    "model": "LogisticRegression",
    "dataset": "CICIDS2017",
    "sample_size": int(len(df)),
    "features": int(X.shape[1]),
    "train_size": int(len(X_train)),
    "test_size": int(len(X_test)),
    "random_state": RANDOM_STATE,

    "accuracy": float(accuracy),

    "benign_precision": float(
        report["BENIGN"]["precision"]
    ),

    "benign_recall": float(
        report["BENIGN"]["recall"]
    ),

    "benign_f1": float(
        report["BENIGN"]["f1-score"]
    ),

    "attack_precision": float(
        report["ATTACK"]["precision"]
    ),

    "attack_recall": float(
        report["ATTACK"]["recall"]
    ),

    "attack_f1": float(
        report["ATTACK"]["f1-score"]
    ),

    "true_negative": int(cm[0][0]),
    "false_positive": int(cm[0][1]),
    "false_negative": int(cm[1][0]),
    "true_positive": int(cm[1][1])
}


# --------------------------------------------------
# 13. Save Metrics
# --------------------------------------------------

metrics_path = RESULTS_DIR / "baseline_metrics.json"

with open(metrics_path, "w") as f:
    json.dump(
        metrics,
        f,
        indent=4
    )


# --------------------------------------------------
# 14. Final Output
# --------------------------------------------------

print("\n" + "=" * 70)
print("FILES SAVED")

print(f"Model  : {model_path}")
print(f"Scaler : {scaler_path}")
print(f"Metrics: {metrics_path}")

print("\nBaseline training complete.")