from dotenv import load_dotenv
import os
import pandas as pd
import uuid
from datetime import datetime, timezone
from elasticsearch import Elasticsearch, helpers

load_dotenv()

# Connect to Elastic
client = Elasticsearch(
    os.getenv("ELASTIC_URL"),
    api_key=os.getenv("ELASTIC_API_KEY")
)

# Load Tuesday's file — this one has real attack labels (Brute Force), not just BENIGN
df = pd.read_csv("ml/data/cicids2017/MachineLearningCVE/Tuesday-WorkingHours.pcap_ISCX.csv")
df.columns = df.columns.str.strip()  # fix the whitespace bug

# Take a small sample first — 500 rows, not all ~445,000
sample = df.sample(n=500, random_state=42)

def row_to_alert(row):
    """Convert one CICIDS2017 row into our alert-schema.json format."""
    is_attack = row['Label'] != 'BENIGN'
    return {
        "alert_id": f"alrt_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "EDR",
        "source_system": "CICIDS2017_dataset",
        "severity_raw": "high" if is_attack else "low",
        "asset_id": f"host-{row['Destination Port']}",
        "asset_criticality": "unknown",
        "description": f"Traffic flow labeled: {row['Label']}",
        "raw_log": row.to_json(),
    }

# Convert all sampled rows into alert format
alerts = [row_to_alert(row) for _, row in sample.iterrows()]

# Bulk push into Elastic, into an index called "alerts"
actions = [
    {"_index": "alerts", "_source": alert}
    for alert in alerts
]

success, errors = helpers.bulk(client, actions, raise_on_error=False)
print(f"Successfully indexed: {success}")
print(f"Errors: {len(errors) if errors else 0}")