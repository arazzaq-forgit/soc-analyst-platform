import pandas as pd
from pathlib import Path

DATA_DIR = Path(
    r"C:\Users\admin\data\data\cicids2017\MachineLearningCVE"
)

OUTPUT_DIR = Path("ml/data")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CHUNK_SIZE = 100_000


def clean_chunk(df):
    # 1. Remove spaces from column names
    df.columns = df.columns.str.strip()

    # 2. Remove completely empty rows
    df = df.dropna(how="all")

    # 3. Clean label text
    df["Label"] = df["Label"].astype(str).str.strip()

    # 4. Convert labels to binary target
    # BENIGN = 0
    # Anything else = 1 (attack)
    df["target"] = (df["Label"] != "BENIGN").astype(int)

    # 5. Remove original text label
    df = df.drop(columns=["Label"])

    # 6. Replace infinite values
    df = df.replace([float("inf"), float("-inf")], pd.NA)

    # 7. Remove rows containing missing values
    df = df.dropna()

    return df


def process_file(file_path):
    print(f"\nProcessing: {file_path.name}")

    output_file = OUTPUT_DIR / f"{file_path.stem}_processed.csv"

    first_chunk = True
    total_rows = 0

    for chunk in pd.read_csv(file_path, chunksize=CHUNK_SIZE):

        chunk = clean_chunk(chunk)

        chunk.to_csv(
            output_file,
            mode="w" if first_chunk else "a",
            header=first_chunk,
            index=False
        )

        first_chunk = False
        total_rows += len(chunk)

    print(f"Saved: {output_file}")
    print(f"Rows: {total_rows:,}")


def main():
    csv_files = sorted(DATA_DIR.glob("*.csv"))

    print(f"Found {len(csv_files)} CSV files.")

    for file_path in csv_files:
        process_file(file_path)

    print("\nPreprocessing complete.")


if __name__ == "__main__":
    main()