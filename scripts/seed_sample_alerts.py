"""Dev helper: adds clearly labelled sample alerts to the LOCAL dev database."""
import getpass
import sqlite3
from datetime import datetime, timedelta, timezone

import requests

BASE_URL = "http://127.0.0.1:8000"

# (alert_id, severity, source, asset, criticality, description, mitre, score, status)
SAMPLES = [
    ("alrt_demo_001", "high", "SIEM", "host-web-03", "high",
     "Sample: multiple failed SSH logins followed by a success", "T1110", 0.04, "resolved"),
    ("alrt_demo_002", "critical", "SIEM", "edge-lb-01", "high",
     "Sample: high-frequency SYN flood against the external load balancer", "T1498", 0.01, "investigating"),
    ("alrt_demo_003", "medium", "cloud_audit", "internal-vlan-20", "medium",
     "Sample: internal TCP SYN port scan across a subnet", "T1046", 0.12, "cleared_threshold"),
    ("alrt_demo_004", "high", "EDR", "api-gateway-prod", "high",
     "Sample: SQL injection payload in an HTTP GET parameter", "T1190", 0.05, "pending"),
    ("alrt_demo_005", "low", "SIEM", "backup-srv-01", "low",
     "Sample: high-volume outbound rsync file replication", "T1048", 0.94, "dismissed"),
    ("alrt_demo_006", "informational", "cloud_audit", "storage-bucket-7", "unknown",
     "Sample: unknown severity value, to test the plain-text badge", None, None, "pending"),
]

email = input("Your email: ").strip()
password = input("Your password: ").strip()

r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
if r.status_code != 200:
    print(f"Login failed ({r.status_code}): {r.text}")
    raise SystemExit(1)
headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

now = datetime.now(timezone.utc)
for i, (aid, sev, src, asset, crit, desc, mitre, _score, _status) in enumerate(SAMPLES):
    payload = {
        "alert_id": aid,
        "timestamp": (now - timedelta(minutes=17 * i)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": src,
        "source_system": "sample-seed",
        "severity_raw": sev,
        "asset_id": asset,
        "asset_criticality": crit,
        "description": desc,
        "mitre_technique": mitre,
        "raw_log": "sample raw log line for " + aid,
        "related_alert_ids": [],
    }
    resp = requests.post(f"{BASE_URL}/alerts/ingest", json=payload, headers=headers)
    if resp.status_code == 201:
        print(aid, "created")
    elif resp.status_code == 409:
        print(aid, "already exists, skipped")
    else:
        print(aid, "FAILED", resp.status_code, resp.text)

conn = sqlite3.connect("dev.db")
cur = conn.cursor()
row = cur.execute("SELECT triage_status FROM alerts LIMIT 1").fetchone()
upper = bool(row) and str(row[0]).isupper()
print("Status values are stored as", "UPPERCASE names" if upper else "lowercase values")

updated = 0
for aid, *_rest, score, status in SAMPLES:
    value = status.upper() if upper else status.lower()
    cur.execute(
        "UPDATE alerts SET false_positive_score = ?, triage_status = ? WHERE alert_id = ?",
        (score, value, aid),
    )
    updated += cur.rowcount
conn.commit()
conn.close()
print("Updated score/status on", updated, "alerts")
