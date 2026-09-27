import pandas as pd
from pathlib import Path

DATA_DIR = Path(
    r"C:\Users\admin\data\data\cicids2017\MachineLearningCVE"
)

csv_files = list(DATA_DIR.glob("*.csv"))

for file in csv_files:

    print("\n" + "=" * 70)
    print(file.name)

    df = pd.read_csv(
        file,
        usecols=[" Label"]
    )

    print(df[" Label"].value_counts())