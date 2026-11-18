from pathlib import Path

import pandas as pd
from sklearn.metrics import classification_report
from xgboost import XGBClassifier


# --------------------------------------------------
# 1. Paths
# --------------------------------------------------

RAW_DATA_DIR = Path(
    r"C:\Users\admin\data\data\cicids2017\MachineLearningCVE"
)

PROCESSED_DATA_DIR = Path("ml/data")

RESULTS_DIR = Path("ml/results")


# --------------------------------------------------
# 2. Configuration
# --------------------------------------------------

MAX_TRAIN_ROWS_PER_FILE = 25_000

RANDOM_STATE = 42


# --------------------------------------------------
# 3. Dataset files
# --------------------------------------------------

DAY_GROUPS = {
    "Monday": [
        "Monday-WorkingHours.pcap_ISCX.csv",
    ],

    "Tuesday": [
        "Tuesday-WorkingHours.pcap_ISCX.csv",
    ],

    "Wednesday": [
        "Wednesday-workingHours.pcap_ISCX.csv",
    ],

    "Thursday": [
        "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
        "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
    ],

    "Friday": [
        "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
        "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
        "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    ],
}


# --------------------------------------------------
# 4. Convert raw filename to processed filename
# --------------------------------------------------

def get_processed_filename(raw_filename):

    return raw_filename.replace(
        ".csv",
        "_processed.csv",
    )


# --------------------------------------------------
# 5. Load training data
# --------------------------------------------------

def load_training_data(training_files):

    frames = []

    print("\nLoading training data...")

    for raw_file in training_files:

        processed_file = (
            PROCESSED_DATA_DIR
            / get_processed_filename(raw_file)
        )

        print(
            f"  Reading: {processed_file.name}"
        )

        df = pd.read_csv(
            processed_file
        )

        # Sample the same maximum number of rows
        # used by our previous cross-day experiment.
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

    feature_frames = []

    label_frames = []

    print("\nLoading test data...")

    for raw_file in test_files:

        processed_file = (
            PROCESSED_DATA_DIR
            / get_processed_filename(raw_file)
        )

        # ------------------------------------------
        # Processed features
        # ------------------------------------------

        print(
            f"  Features: "
            f"{processed_file.name}"
        )

        features = pd.read_csv(
            processed_file
        )

        # ------------------------------------------
        # Aligned original attack labels
        # ------------------------------------------
        #
        # These label files were created using the
        # same preprocessing row-filtering logic as
        # the processed feature files.
        #
        # Therefore their row count and row order
        # exactly match the processed features.
        # ------------------------------------------

        label_file = (
            RESULTS_DIR
            / raw_file.replace(
                ".csv",
                "_labels.csv",
            )
        )

        print(
            f"  Labels: "
            f"{label_file.name}"
        )

        if not label_file.exists():

            raise FileNotFoundError(
                f"Aligned label file not found: "
                f"{label_file}"
            )

        label_df = pd.read_csv(
            label_file
        )

        if "attack_type" not in label_df.columns:

            raise ValueError(
                f"'attack_type' column not found "
                f"in {label_file.name}"
            )

        labels = (
            label_df["attack_type"]
            .astype(str)
            .str.strip()
            .reset_index(drop=True)
        )

        # ------------------------------------------
        # IMPORTANT:
        #
        # The processed dataset has already removed
        # invalid rows and contains:
        #
        # 78 features + target
        #
        # We remove target here because XGBoost
        # expects only feature columns.
        # ------------------------------------------

        if "target" not in features.columns:

            raise ValueError(
                f"'target' column not found "
                f"in {processed_file.name}"
            )

        features_only = features.drop(
            columns=["target"]
        )

        # ------------------------------------------
        # Verify feature count
        # ------------------------------------------

        print(
            f"    Feature columns: "
            f"{len(features_only.columns)}"
        )

        print(
            f"    Test rows: "
            f"{len(features_only):,}"
        )

        # ------------------------------------------
        # Check row alignment
        # ------------------------------------------

        if len(features_only) != len(labels):

            raise ValueError(
                f"Row alignment failed for "
                f"{raw_file}.\n"
                f"Processed rows: "
                f"{len(features_only):,}\n"
                f"Raw label rows: "
                f"{len(labels):,}"
            )

        feature_frames.append(
            features_only
        )

        label_frames.append(
            labels
        )

    # ----------------------------------------------
    # Combine all test files
    # ----------------------------------------------

    X_test = pd.concat(
        feature_frames,
        ignore_index=True,
    )

    original_labels = pd.concat(
        label_frames,
        ignore_index=True,
    )

    return X_test, original_labels


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

def evaluate_day(held_out_day):

    print("\n" + "=" * 70)

    print(
        f"HOLDING OUT: {held_out_day}"
    )

    print("=" * 70)

    # ----------------------------------------------
    # Determine train/test files
    # ----------------------------------------------

    test_files = DAY_GROUPS[
        held_out_day
    ]

    training_files = []

    for day, files in DAY_GROUPS.items():

        if day != held_out_day:

            training_files.extend(
                files
            )

    print("\nTraining files:")

    for file in training_files:

        print(
            f"  - {file}"
        )

    print("\nHeld-out files:")

    for file in test_files:

        print(
            f"  - {file}"
        )

    # ----------------------------------------------
    # Load training data
    # ----------------------------------------------

    train_df = load_training_data(
        training_files
    )

    # ----------------------------------------------
    # Training features
    # ----------------------------------------------

    X_train = train_df.drop(
        columns=["target"]
    )

    y_train = train_df["target"]

    # ----------------------------------------------
    # Load test data
    # ----------------------------------------------

    X_test, original_labels = (
        load_test_data(
            test_files
        )
    )

    # ----------------------------------------------
    # Make test columns EXACTLY match training
    # ----------------------------------------------
    #
    # This is important because CICIDS2017 has
    # minor column-name differences in the raw
    # files compared with the cleaned processed
    # files.
    #
    # We use the processed training feature names
    # as the authoritative schema.
    # ----------------------------------------------

    missing_columns = [
        column
        for column in X_train.columns
        if column not in X_test.columns
    ]

    extra_columns = [
        column
        for column in X_test.columns
        if column not in X_train.columns
    ]

    if missing_columns:

        raise ValueError(
            "Test data is missing feature columns:\n"
            + "\n".join(
                missing_columns
            )
        )

    if extra_columns:

        print(
            "\nRemoving extra test columns:"
        )

        for column in extra_columns:

            print(
                f"  - {column}"
            )

        X_test = X_test.drop(
            columns=extra_columns
        )

    # Reorder test columns to exactly match
    # training column order.

    X_test = X_test[
        X_train.columns
    ]

    # ----------------------------------------------
    # Final feature verification
    # ----------------------------------------------

    if list(X_train.columns) != list(
        X_test.columns
    ):

        raise ValueError(
            "Training and test feature schemas "
            "still do not match."
        )

    print(
        "\nFeature schema verified."
    )

    print(
        f"Training features: "
        f"{X_train.shape[1]}"
    )

    print(
        f"Test features: "
        f"{X_test.shape[1]}"
    )

    # ----------------------------------------------
    # Convert original labels to binary
    # ----------------------------------------------

    y_test_binary = (
        original_labels
        .str.upper()
        .ne("BENIGN")
        .astype(int)
    )

    # ----------------------------------------------
    # Verify target counts
    # ----------------------------------------------

    print("\nTraining target:")

    print(
        y_train
        .value_counts()
        .sort_index()
    )

    print("\nTest target:")

    print(
        y_test_binary
        .value_counts()
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
    # Train model
    # ----------------------------------------------

    print(
        "\nTraining XGBoost..."
    )

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

    predictions = model.predict(
        X_test
    )

    # ----------------------------------------------
    # Overall binary classification
    # ----------------------------------------------

    print(
        "\nOverall binary classification:"
    )

    print(
        classification_report(
            y_test_binary,
            predictions,
            labels=[0, 1],
            target_names=[
                "BENIGN",
                "ATTACK",
            ],
            zero_division=0,
        )
    )

    # ----------------------------------------------
    # Create result dataframe
    # ----------------------------------------------

    results = pd.DataFrame(
        {
            "attack_type": original_labels,
            "actual_binary": y_test_binary,
            "predicted_binary": predictions,
        }
    )

    # ----------------------------------------------
    # Attack-class evaluation
    # ----------------------------------------------

    attack_results = []

    attack_types = sorted(
        results.loc[
            results["attack_type"].str.upper()
            != "BENIGN",
            "attack_type",
        ].unique()
    )

    print(
        "\n" + "-" * 70
    )

    print(
        f"{'Attack Type':<35}"
        f"{'Samples':>12}"
        f"{'Detected':>12}"
        f"{'Recall':>12}"
    )

    print(
        "-" * 70
    )

    for attack_type in attack_types:

        subset = results[
            results["attack_type"]
            == attack_type
        ]

        samples = len(subset)

        detected = int(
            subset[
                "predicted_binary"
            ].sum()
        )

        missed = (
            samples - detected
        )

        if samples > 0:

            recall = (
                detected / samples
            )

        else:

            recall = 0.0

        print(
            f"{attack_type:<35}"
            f"{samples:>12,}"
            f"{detected:>12,}"
            f"{recall:>11.2%}"
        )

        attack_results.append(
            {
                "held_out_day":
                    held_out_day,

                "attack_type":
                    attack_type,

                "samples":
                    samples,

                "detected":
                    detected,

                "missed":
                    missed,

                "recall":
                    recall,
            }
        )

    return attack_results


# --------------------------------------------------
# 9. Main
# --------------------------------------------------

def main():

    print("=" * 70)

    print(
        "CICIDS2017 CLASS-AWARE "
        "XGBOOST EVALUATION"
    )

    print("=" * 70)

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    all_results = []

    # Monday contains only BENIGN traffic,
    # so it cannot provide attack-class recall.
    evaluation_days = [
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
    ]

    for day in evaluation_days:

        results = evaluate_day(
            day
        )

        all_results.extend(
            results
        )

    # ----------------------------------------------
    # Save results
    # ----------------------------------------------

    output = pd.DataFrame(
        all_results
    )

    output_file = (
        RESULTS_DIR
        / "attack_class_evaluation.csv"
    )

    output.to_csv(
        output_file,
        index=False,
    )

    # ----------------------------------------------
    # Final summary
    # ----------------------------------------------

    print(
        "\n" + "=" * 70
    )

    print(
        "CLASS-AWARE EVALUATION SUMMARY"
    )

    print(
        "=" * 70
    )

    print(
        output.to_string(
            index=False
        )
    )

    print(
        "\nResults saved to:"
    )

    print(
        output_file
    )


# --------------------------------------------------
# 10. Entry point
# --------------------------------------------------

if __name__ == "__main__":
    main()