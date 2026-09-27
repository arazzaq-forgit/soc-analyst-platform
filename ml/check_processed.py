import pandas as pd
from pathlib import Path

DATA_DIR = Path("ml/data")

csv_files = sorted(DATA_DIR.glob("*_processed.csv"))

print(f"Found {len(csv_files)} processed files.\n")

total_rows = 0

for file in csv_files:

    print("=" * 70)
    print(file.name)

    df = pd.read_csv(file)

    print("Shape:", df.shape)

    print("\nTarget distribution:")
    print(df["target"].value_counts())

    print("\nMissing values:", df.isna().sum().sum())

    print("Non-numeric columns:")
    non_numeric = df.select_dtypes(exclude="number").columns.tolist()
    print(non_numeric)

    total_rows += len(df)

print("\n" + "=" * 70)
print(f"TOTAL PROCESSED ROWS: {total_rows:,}")