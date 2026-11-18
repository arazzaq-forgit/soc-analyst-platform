import pandas as pd
import joblib

from pathlib import Path

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score
)

from xgboost import XGBClassifier


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

RANDOM_STATE = 42

TEST_FILE_NAME = (
    "Wednesday-workingHours.pcap_ISCX_processed.csv"
)


MAX_TRAIN_ROWS_PER_FILE = 25_000


# --------------------------------------------------
# 3. Load training data
# --------------------------------------------------

def load_training_data():

    csv_files = sorted(
        DATA_DIR.glob("*_processed.csv")
    )

    train_frames = []

    print("TRAINING FILES")
    print("=" * 70)

    for file in csv_files:

        if file.name == TEST_FILE_NAME:
            continue

        print(f"Loading: {file.name}")

        df = pd.read_csv(file)

        if len(df) > MAX_TRAIN_ROWS_PER_FILE:

            df = df.sample(
                n=MAX_TRAIN_ROWS_PER_FILE,
                random_state=RANDOM_STATE
            )

        train_frames.append(df)

        print(
            f"Rows selected: {len(df):,}"
        )

    train_df = pd.concat(
        train_frames,
        ignore_index=True
    )

    return train_df


# --------------------------------------------------
# 4. Load held-out test data
# --------------------------------------------------

def load_test_data():

    test_file = DATA_DIR / TEST_FILE_NAME

    print("\n" + "=" * 70)
    print("HELD-OUT TEST FILE")
    print("=" * 70)

    print(
        f"Loading: {test_file.name}"
    )

    test_df = pd.read_csv(
        test_file
    )

    print(
        f"Test rows: {len(test_df):,}"
    )

    return test_df


# --------------------------------------------------
# 5. Load datasets
# --------------------------------------------------

train_df = load_training_data()

test_df = load_test_data()


print("\n" + "=" * 70)

print(
    f"Training rows: {len(train_df):,}"
)

print(
    f"Testing rows: {len(test_df):,}"
)


# --------------------------------------------------
# 6. Separate features and target
# --------------------------------------------------

X_train = train_df.drop(
    columns=["target"]
)

y_train = train_df["target"]


X_test = test_df.drop(
    columns=["target"]
)

y_test = test_df["target"]


print("\nTraining feature shape:")
print(X_train.shape)

print("\nTesting feature shape:")
print(X_test.shape)


# --------------------------------------------------
# 7. Show target distributions
# --------------------------------------------------

print("\n" + "=" * 70)

print("TRAINING TARGET DISTRIBUTION")

print(
    y_train.value_counts()
)


print("\nTEST TARGET DISTRIBUTION")

print(
    y_test.value_counts()
)


# --------------------------------------------------
# 8. Calculate class imbalance
# --------------------------------------------------

negative_count = (
    y_train == 0
).sum()

positive_count = (
    y_train == 1
).sum()

scale_pos_weight = (
    negative_count /
    positive_count
)


print("\n" + "=" * 70)

print("CLASS BALANCE")

print(
    "Benign training samples:",
    negative_count
)

print(
    "Attack training samples:",
    positive_count
)

print(
    "scale_pos_weight:",
    round(
        scale_pos_weight,
        4
    )
)


# --------------------------------------------------
# 9. Train XGBoost
# --------------------------------------------------

print("\n" + "=" * 70)

print(
    "Training XGBoost on unseen-day setup..."
)


model = XGBClassifier(

    n_estimators=300,

    max_depth=6,

    learning_rate=0.1,

    subsample=0.8,

    colsample_bytree=0.8,

    objective="binary:logistic",

    eval_metric="logloss",

    scale_pos_weight=scale_pos_weight,

    random_state=RANDOM_STATE,

    n_jobs=-1
)


model.fit(
    X_train,
    y_train
)


# --------------------------------------------------
# 10. Generate predictions
# --------------------------------------------------

print(
    "\nGenerating predictions..."
)

y_pred = model.predict(
    X_test
)


# --------------------------------------------------
# 11. Evaluate
# --------------------------------------------------

print("\n" + "=" * 70)

print(
    "HELD-OUT DAY RESULTS"
)


accuracy = accuracy_score(
    y_test,
    y_pred
)


print(
    f"\nAccuracy: {accuracy:.4f}"
)


print(
    "\nClassification Report:"
)


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


cm = confusion_matrix(
    y_test,
    y_pred
)


print(
    "\nConfusion Matrix:"
)

print(cm)


# --------------------------------------------------
# 12. Save evaluation results
# --------------------------------------------------

result = {

    "model": "XGBoost",

    "training_strategy":
        "All files except Wednesday",

    "test_file":
        TEST_FILE_NAME,

    "training_rows":
        int(len(train_df)),

    "testing_rows":
        int(len(test_df)),

    "accuracy":
        float(accuracy),

    "true_negative":
        int(cm[0][0]),

    "false_positive":
        int(cm[0][1]),

    "false_negative":
        int(cm[1][0]),

    "true_positive":
        int(cm[1][1])
}


result_path = (
    RESULTS_DIR /
    "xgboost_heldout_day_results.json"
)


import json

with open(
    result_path,
    "w"
) as f:

    json.dump(
        result,
        f,
        indent=4
    )


print("\n" + "=" * 70)

print(
    "RESULT SAVED"
)

print(
    result_path
)

print(
    "\nHeld-out day evaluation complete."
)
