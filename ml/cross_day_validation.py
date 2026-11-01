import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from xgboost import XGBClassifier


# --------------------------------------------------
# 1. Paths and configuration
# --------------------------------------------------

DATA_DIR = Path("ml/data")
RESULTS_DIR = Path("ml/results")

MAX_TRAIN_ROWS_PER_FILE = 25_000
RANDOM_STATE = 42


# --------------------------------------------------
# 2. Find actual processed files
# --------------------------------------------------

def get_processed_files():
    files = sorted(
        DATA_DIR.glob("*_processed.csv")
    )

    if not files:
        raise FileNotFoundError(
            f"No processed CSV files found in {DATA_DIR}"
        )

    print("\nFound processed files:")

    for file in files:
        print(f"  - {file.name}")

    return files


# --------------------------------------------------
# 3. Identify the day from filename
# --------------------------------------------------

def get_day(file_path):
    name = file_path.name.lower()

    if name.startswith("monday"):
        return "Monday"

    if name.startswith("tuesday"):
        return "Tuesday"

    if name.startswith("wednesday"):
        return "Wednesday"

    if name.startswith("thursday"):
        return "Thursday"

    if name.startswith("friday"):
        return "Friday"

    return "Unknown"


# --------------------------------------------------
# 4. Group files by day
# --------------------------------------------------

def group_files_by_day(files):

    day_groups = {
        "Monday": [],
        "Tuesday": [],
        "Wednesday": [],
        "Thursday": [],
        "Friday": [],
    }

    for file in files:

        day = get_day(file)

        if day != "Unknown":
            day_groups[day].append(file)

    return day_groups


# --------------------------------------------------
# 5. Load training data
# --------------------------------------------------

def load_training_data(training_files):

    frames = []

    print("\nLoading training data...")

    for file_path in training_files:

        print(
            f"  Reading: {file_path.name}"
        )

        df = pd.read_csv(file_path)

        if len(df) > MAX_TRAIN_ROWS_PER_FILE:

            df = df.sample(
                n=MAX_TRAIN_ROWS_PER_FILE,
                random_state=RANDOM_STATE,
            )

        frames.append(df)

        print(
            f"    Selected rows: "
            f"{len(df):,}"
        )

    combined = pd.concat(
        frames,
        ignore_index=True,
    )

    return combined


# --------------------------------------------------
# 6. Load test data
# --------------------------------------------------

def load_test_data(test_files):

    frames = []

    print("\nLoading test data...")

    for file_path in test_files:

        print(
            f"  Reading: {file_path.name}"
        )

        df = pd.read_csv(file_path)

        frames.append(df)

        print(
            f"    Test rows: "
            f"{len(df):,}"
        )

    combined = pd.concat(
        frames,
        ignore_index=True,
    )

    return combined


# --------------------------------------------------
# 7. Build XGBoost model
# --------------------------------------------------

def build_model(scale_pos_weight):

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

        n_jobs=-1,
    )

    return model


# --------------------------------------------------
# 8. Evaluate one held-out day
# --------------------------------------------------

def evaluate_day(
    held_out_day,
    day_groups,
):

    print("\n" + "=" * 70)

    print(
        f"HOLDING OUT: {held_out_day}"
    )

    print("=" * 70)

    # ----------------------------------------------
    # Test files
    # ----------------------------------------------

    test_files = day_groups[
        held_out_day
    ]

    # ----------------------------------------------
    # Training files
    # ----------------------------------------------

    training_files = []

    for day, files in day_groups.items():

        if day != held_out_day:

            training_files.extend(files)

    print("\nTraining files:")

    for file_path in training_files:

        print(
            f"  - {file_path.name}"
        )

    print("\nHeld-out test files:")

    for file_path in test_files:

        print(
            f"  - {file_path.name}"
        )

    # ----------------------------------------------
    # Load data
    # ----------------------------------------------

    train_df = load_training_data(
        training_files
    )

    test_df = load_test_data(
        test_files
    )

    # ----------------------------------------------
    # Features and target
    # ----------------------------------------------

    X_train = train_df.drop(
        columns=["target"]
    )

    y_train = train_df["target"]

    X_test = test_df.drop(
        columns=["target"]
    )

    y_test = test_df["target"]

    # ----------------------------------------------
    # Dataset information
    # ----------------------------------------------

    print("\nTraining shape:")

    print(X_train.shape)

    print("\nTest shape:")

    print(X_test.shape)

    print("\nTraining target distribution:")

    print(
        y_train.value_counts()
        .sort_index()
    )

    print("\nTest target distribution:")

    print(
        y_test.value_counts()
        .sort_index()
    )

    # ----------------------------------------------
    # Class weight
    # ----------------------------------------------

    benign_count = int(
        (y_train == 0).sum()
    )

    attack_count = int(
        (y_train == 1).sum()
    )

    if attack_count == 0:

        scale_pos_weight = 1.0

    else:

        scale_pos_weight = (
            benign_count
            / attack_count
        )

    print(
        f"\nscale_pos_weight: "
        f"{scale_pos_weight:.4f}"
    )

    # ----------------------------------------------
    # Train
    # ----------------------------------------------

    print("\nTraining XGBoost...")

    model = build_model(
        scale_pos_weight
    )

    model.fit(
        X_train,
        y_train,
    )

    print(
        "Training completed."
    )

    # ----------------------------------------------
    # Predict
    # ----------------------------------------------

    print(
        "\nGenerating predictions..."
    )

    y_pred = model.predict(
        X_test
    )

    # ----------------------------------------------
    # Metrics
    # ----------------------------------------------

    accuracy = accuracy_score(
        y_test,
        y_pred,
    )

    report = classification_report(
        y_test,
        y_pred,
        labels=[0, 1],
        target_names=[
            "BENIGN",
            "ATTACK",
        ],
        output_dict=True,
        zero_division=0,
    )

    confusion = confusion_matrix(
        y_test,
        y_pred,
        labels=[0, 1],
    )

    # ----------------------------------------------
    # Print results
    # ----------------------------------------------

    print("\nResults:")

    print(
        f"Accuracy: {accuracy:.4f}"
    )

    print(
        "\nClassification Report:"
    )

    print(
        classification_report(
            y_test,
            y_pred,
            labels=[0, 1],
            target_names=[
                "BENIGN",
                "ATTACK",
            ],
            zero_division=0,
        )
    )

    print(
        "Confusion Matrix:"
    )

    print(confusion)

    # ----------------------------------------------
    # Confusion matrix
    # ----------------------------------------------

    tn = int(confusion[0][0])

    fp = int(confusion[0][1])

    fn = int(confusion[1][0])

    tp = int(confusion[1][1])

    # ----------------------------------------------
    # Return result
    # ----------------------------------------------

    return {

        "held_out_day": held_out_day,

        "training_files": [
            file.name
            for file in training_files
        ],

        "test_files": [
            file.name
            for file in test_files
        ],

        "training_rows": int(
            len(train_df)
        ),

        "test_rows": int(
            len(test_df)
        ),

        "training_benign":
            benign_count,

        "training_attack":
            attack_count,

        "test_benign": int(
            (y_test == 0).sum()
        ),

        "test_attack": int(
            (y_test == 1).sum()
        ),

        "scale_pos_weight":
            float(scale_pos_weight),

        "accuracy":
            float(accuracy),

        "benign_precision":
            float(
                report["BENIGN"]
                ["precision"]
            ),

        "benign_recall":
            float(
                report["BENIGN"]
                ["recall"]
            ),

        "benign_f1":
            float(
                report["BENIGN"]
                ["f1-score"]
            ),

        "attack_precision":
            float(
                report["ATTACK"]
                ["precision"]
            ),

        "attack_recall":
            float(
                report["ATTACK"]
                ["recall"]
            ),

        "attack_f1":
            float(
                report["ATTACK"]
                ["f1-score"]
            ),

        "tn": tn,

        "fp": fp,

        "fn": fn,

        "tp": tp,
    }


# --------------------------------------------------
# 9. Main
# --------------------------------------------------

def main():

    print("=" * 70)

    print(
        "CROSS-DAY XGBOOST VALIDATION"
    )

    print("=" * 70)

    # ----------------------------------------------
    # Create results directory
    # ----------------------------------------------

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ----------------------------------------------
    # Find files
    # ----------------------------------------------

    processed_files = (
        get_processed_files()
    )

    # ----------------------------------------------
    # Group files by day
    # ----------------------------------------------

    day_groups = (
        group_files_by_day(
            processed_files
        )
    )

    print("\nFiles grouped by day:")

    for day, files in day_groups.items():

        print(
            f"\n{day}:"
        )

        for file in files:

            print(
                f"  - {file.name}"
            )

    # ----------------------------------------------
    # Check all days exist
    # ----------------------------------------------

    expected_days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
    ]

    for day in expected_days:

        if not day_groups[day]:

            raise RuntimeError(
                f"No processed files found "
                f"for {day}"
            )

    # ----------------------------------------------
    # Run validation
    # ----------------------------------------------

    all_results = []

    for day in expected_days:

        result = evaluate_day(
            day,
            day_groups,
        )

        all_results.append(
            result
        )

    # ----------------------------------------------
    # Save results
    # ----------------------------------------------

    output_file = (
        RESULTS_DIR
        / "xgboost_cross_day_validation.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            all_results,
            f,
            indent=4,
        )

    # ----------------------------------------------
    # Final summary
    # ----------------------------------------------

    print("\n" + "=" * 70)

    print(
        "CROSS-DAY VALIDATION SUMMARY"
    )

    print("=" * 70)

    for result in all_results:

        print(
            f"\n{result['held_out_day']}"
        )

        print(
            f"  Accuracy: "
            f"{result['accuracy']:.4f}"
        )

        print(
            f"  Attack Precision: "
            f"{result['attack_precision']:.4f}"
        )

        print(
            f"  Attack Recall: "
            f"{result['attack_recall']:.4f}"
        )

        print(
            f"  Attack F1: "
            f"{result['attack_f1']:.4f}"
        )

        print(
            f"  False Positives: "
            f"{result['fp']:,}"
        )

        print(
            f"  False Negatives: "
            f"{result['fn']:,}"
        )

    print("\nResults saved to:")

    print(output_file)


# --------------------------------------------------
# 10. Entry point
# --------------------------------------------------

if __name__ == "__main__":

    main()