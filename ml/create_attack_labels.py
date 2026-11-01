from pathlib import Path

import pandas as pd


# --------------------------------------------------
# 1. Paths
# --------------------------------------------------

RAW_DATA_DIR = Path(
    r"C:\Users\admin\data\data\cicids2017\MachineLearningCVE"
)

RESULTS_DIR = Path("ml/results")


# --------------------------------------------------
# 2. Raw files
# --------------------------------------------------

RAW_FILES = [
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
    "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    "Monday-WorkingHours.pcap_ISCX.csv",
    "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
    "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
    "Tuesday-WorkingHours.pcap_ISCX.csv",
    "Wednesday-workingHours.pcap_ISCX.csv",
]


# --------------------------------------------------
# 3. Clean label
# --------------------------------------------------

def clean_label(label):

    label = str(label).strip()

    if label.upper() == "BENIGN":
        return "BENIGN"

    return label


# --------------------------------------------------
# 4. Process one file
# --------------------------------------------------

def process_file(file_name):

    file_path = RAW_DATA_DIR / file_name

    print("\n" + "=" * 70)

    print(
        f"Processing: {file_name}"
    )

    print("=" * 70)

    # --------------------------------------------------
    # Read complete raw file
    # --------------------------------------------------

    df = pd.read_csv(
        file_path
    )

    # --------------------------------------------------
    # Clean column names
    # --------------------------------------------------

    df.columns = (
        df.columns
        .str.strip()
    )

    # --------------------------------------------------
    # Verify Label
    # --------------------------------------------------

    if "Label" not in df.columns:

        raise ValueError(
            f"Label column not found in "
            f"{file_name}"
        )

    # --------------------------------------------------
    # Store original labels BEFORE dropping anything
    # --------------------------------------------------

    labels = (
        df["Label"]
        .astype(str)
        .str.strip()
        .reset_index(drop=True)
    )

    # --------------------------------------------------
    # Remove Label from features
    # --------------------------------------------------

    features = df.drop(
        columns=["Label"]
    )

    # --------------------------------------------------
    # Convert infinite values to NaN
    # --------------------------------------------------

    features = features.replace(
        [float("inf"), float("-inf")],
        pd.NA,
    )

    # --------------------------------------------------
    # Find rows that contain missing values
    # --------------------------------------------------

    valid_rows = ~features.isna().any(
        axis=1
    )

    # --------------------------------------------------
    # Keep ONLY rows that survived preprocessing
    # --------------------------------------------------

    labels = labels.loc[
        valid_rows
    ].reset_index(drop=True)

    # --------------------------------------------------
    # Save labels
    # --------------------------------------------------

    output_name = (
        file_name.replace(
            ".csv",
            "_labels.csv",
        )
    )

    output_file = (
        RESULTS_DIR / output_name
    )

    label_output = pd.DataFrame(
        {
            "attack_type": labels
        }
    )

    label_output.to_csv(
        output_file,
        index=False,
    )

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    print(
        f"Original rows: "
        f"{len(df):,}"
    )

    print(
        f"Valid rows: "
        f"{len(labels):,}"
    )

    print(
        f"Removed rows: "
        f"{len(df) - len(labels):,}"
    )

    print(
        "\nAttack distribution:"
    )

    print(
        labels.value_counts()
    )

    print(
        "\nSaved:"
    )

    print(output_file)

    return output_file


# --------------------------------------------------
# 5. Main
# --------------------------------------------------

def main():

    print("=" * 70)

    print(
        "CREATING ALIGNED CICIDS2017 "
        "ATTACK LABEL FILES"
    )

    print("=" * 70)

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    for file_name in RAW_FILES:

        process_file(
            file_name
        )

    print("\n" + "=" * 70)

    print(
        "LABEL CREATION COMPLETED"
    )

    print("=" * 70)


# --------------------------------------------------
# 6. Entry point
# --------------------------------------------------

if __name__ == "__main__":

    main()