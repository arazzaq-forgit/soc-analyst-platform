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
# 2. Raw CICIDS2017 files
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
# 3. Identify day
# --------------------------------------------------

def get_day(file_name):
    name = file_name.lower()

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
# 4. Clean attack labels
# --------------------------------------------------

def clean_label(label):
    label = str(label).strip()

    if label.upper() == "BENIGN":
        return "BENIGN"

    return label


# --------------------------------------------------
# 5. Analyze one file
# --------------------------------------------------

def analyze_file(file_name):
    file_path = RAW_DATA_DIR / file_name

    print("\n" + "=" * 70)
    print(f"FILE: {file_name}")
    print("=" * 70)

    print("Reading labels...")

    # Read the CSV first.
    # We do this because the original CICIDS2017 files
    # may contain whitespace around column names.
    df = pd.read_csv(file_path)

    # Remove whitespace from column names.
    df.columns = df.columns.str.strip()

    # Make sure the Label column exists.
    if "Label" not in df.columns:
        raise ValueError(
            f"'Label' column not found in {file_name}. "
            f"Available columns: {list(df.columns)}"
        )

    # Keep only the Label column.
    df = df[["Label"]]

    # Clean the labels.
    df["Label"] = df["Label"].map(clean_label)

    # Identify the day.
    day = get_day(file_name)

    # Count each label.
    counts = (
        df["Label"]
        .value_counts()
        .rename_axis("attack_type")
        .reset_index(name="count")
    )

    counts["day"] = day

    # Total number of rows.
    total = len(df)

    # Percentage of each label within this file.
    counts["percentage"] = (
        counts["count"] / total * 100
    )

    counts["source_file"] = file_name

    # Print results.
    print(f"Total rows: {total:,}")

    print("\nLabel distribution:")

    for _, row in counts.iterrows():
        print(
            f"  {row['attack_type']:<25}"
            f"{int(row['count']):>10,}"
            f"  {row['percentage']:>8.2f}%"
        )

    return counts


# --------------------------------------------------
# 6. Main
# --------------------------------------------------

def main():
    print("=" * 70)
    print("CICIDS2017 ATTACK DISTRIBUTION ANALYSIS")
    print("=" * 70)

    # Create results directory if it does not exist.
    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    all_results = []

    # --------------------------------------------------
    # Analyze every raw file
    # --------------------------------------------------

    for file_name in RAW_FILES:
        result = analyze_file(file_name)

        all_results.append(result)

    # --------------------------------------------------
    # Combine all results
    # --------------------------------------------------

    distribution = pd.concat(
        all_results,
        ignore_index=True,
    )

    # --------------------------------------------------
    # Save detailed distribution
    # --------------------------------------------------

    detailed_file = (
        RESULTS_DIR
        / "attack_distribution_by_file.csv"
    )

    distribution.to_csv(
        detailed_file,
        index=False,
    )

    # --------------------------------------------------
    # Aggregate by day and attack type
    # --------------------------------------------------

    day_distribution = (
        distribution
        .groupby(
            ["day", "attack_type"],
            as_index=False,
        )["count"]
        .sum()
    )

    # Calculate total rows for each day.
    day_totals = (
        day_distribution
        .groupby("day")["count"]
        .transform("sum")
    )

    # Calculate percentage within each day.
    day_distribution["percentage"] = (
        day_distribution["count"]
        / day_totals
        * 100
    )

    # --------------------------------------------------
    # Save day-level distribution
    # --------------------------------------------------

    day_file = (
        RESULTS_DIR
        / "attack_distribution_by_day.csv"
    )

    day_distribution.to_csv(
        day_file,
        index=False,
    )

    # --------------------------------------------------
    # Attack-only distribution
    # --------------------------------------------------

    attacks_only = distribution[
        distribution["attack_type"] != "BENIGN"
    ].copy()

    attack_day = (
        attacks_only
        .groupby(
            ["day", "attack_type"],
            as_index=False,
        )["count"]
        .sum()
    )

    # Calculate total attacks for each day.
    attack_totals = (
        attack_day
        .groupby("day")["count"]
        .transform("sum")
    )

    # Calculate percentage of attacks belonging
    # to each attack type.
    attack_day["percentage_of_attacks"] = (
        attack_day["count"]
        / attack_totals
        * 100
    )

    # --------------------------------------------------
    # Save attack-only distribution
    # --------------------------------------------------

    attack_file = (
        RESULTS_DIR
        / "attack_only_distribution_by_day.csv"
    )

    attack_day.to_csv(
        attack_file,
        index=False,
    )

    # --------------------------------------------------
    # Print day summary
    # --------------------------------------------------

    print("\n" + "=" * 70)
    print("DAY-LEVEL ATTACK DISTRIBUTION")
    print("=" * 70)

    for day in [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
    ]:
        day_data = day_distribution[
            day_distribution["day"] == day
        ].copy()

        total = day_data["count"].sum()

        benign = day_data.loc[
            day_data["attack_type"] == "BENIGN",
            "count",
        ].sum()

        attacks = total - benign

        print(f"\n{day}")

        print(
            f"  Total traffic: "
            f"{total:,}"
        )

        print(
            f"  Benign: "
            f"{benign:,} "
            f"({benign / total * 100:.2f}%)"
        )

        print(
            f"  Attack: "
            f"{attacks:,} "
            f"({attacks / total * 100:.2f}%)"
        )

        print("\n  Attack types:")

        attack_rows = day_data[
            day_data["attack_type"] != "BENIGN"
        ].sort_values(
            "count",
            ascending=False,
        )

        for _, row in attack_rows.iterrows():
            print(
                f"    "
                f"{row['attack_type']:<25}"
                f"{int(row['count']):>10,}"
                f"  "
                f"{row['percentage']:>7.2f}%"
            )

    # --------------------------------------------------
    # Identify attack classes by day
    # --------------------------------------------------

    presence = (
        attack_day
        .pivot_table(
            index="attack_type",
            columns="day",
            values="count",
            aggfunc="sum",
            fill_value=0,
        )
    )

    # --------------------------------------------------
    # Save attack class presence
    # --------------------------------------------------

    presence_file = (
        RESULTS_DIR
        / "attack_class_presence_by_day.csv"
    )

    presence.to_csv(
        presence_file
    )

    # --------------------------------------------------
    # Final output
    # --------------------------------------------------

    print("\n" + "=" * 70)
    print("FILES CREATED")
    print("=" * 70)

    print(f"\n{detailed_file}")
    print(day_file)
    print(attack_file)
    print(presence_file)


# --------------------------------------------------
# 7. Entry point
# --------------------------------------------------

if __name__ == "__main__":
    main()