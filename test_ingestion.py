"""
Test for the alert-ingestion endpoint.

Uses Razzaq's exact example alert from /docs/alert-schema.md.

Usage:
    Make sure your server is running first:
        uvicorn app.main:app --reload

    Then, in a separate terminal:
        python test_ingestion.py
"""

import sys

import requests

BASE_URL = "http://127.0.0.1:8000"


def check(label: str, condition: bool):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        sys.exit(1)


def main():
    at = chr(64)
    email = "ingestion.test" + at + "example.com"
    password = "testpass123"

    # Register + login to get a token (ingestion is auth-protected)
    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password})
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    alert_payload = {
        "alert_id": "alrt_8f3c1a2b",
        "timestamp": "2026-08-03T14:32:10Z",
        "source": "SIEM",
        "source_system": "Elastic Security",
        "severity_raw": "high",
        "asset_id": "host-web-03",
        "asset_criticality": "high",
        "description": "Multiple failed SSH login attempts followed by a successful login",
        "mitre_technique": "T1110",
        "raw_log": (
            "2026-08-03T14:32:10Z sshd[2211]: Failed password for root from "
            "203.0.113.7 port 51122 ssh2 (x7), then Accepted password for "
            "root from 203.0.113.7"
        ),
        "related_alert_ids": [],
    }

    # Clean up from a previous run, if any
    requests.delete  # (no delete endpoint by design — skeleton stage)

    print("--- ingest Razzaq's exact example alert ---")
    r = requests.post(f"{BASE_URL}/alerts/ingest", json=alert_payload, headers=headers)
    if r.status_code == 409:
        print("(alert already exists from a previous run — that's fine, continuing)")
    else:
        check(f"Ingest returns 201 (got {r.status_code})", r.status_code == 201)
        check("Response has triage_status = pending", r.json()["triage_status"] == "pending")

    print("\n--- ingest without alert_id (should auto-generate one) ---")
    payload2 = dict(alert_payload)
    del payload2["alert_id"]
    payload2["asset_id"] = "host-test-auto"
    r = requests.post(f"{BASE_URL}/alerts/ingest", json=payload2, headers=headers)
    check(f"Auto-ID ingest returns 201 (got {r.status_code})", r.status_code == 201)
    check("An alert_id was generated", r.json()["alert_id"].startswith("alrt_"))

    print("\n--- duplicate alert_id is rejected ---")
    r = requests.post(f"{BASE_URL}/alerts/ingest", json=alert_payload, headers=headers)
    check(f"Duplicate returns 409 (got {r.status_code})", r.status_code == 409)

    print("\n--- fetch the alert back ---")
    r = requests.get(f"{BASE_URL}/alerts/alrt_8f3c1a2b", headers=headers)
    check(f"Fetch returns 200 (got {r.status_code})", r.status_code == 200)
    check("asset_id matches what was ingested", r.json()["asset_id"] == "host-web-03")

    print("\n--- fetch a nonexistent alert ---")
    r = requests.get(f"{BASE_URL}/alerts/does-not-exist", headers=headers)
    check(f"Nonexistent alert returns 404 (got {r.status_code})", r.status_code == 404)

    print("\n--- list alerts ---")
    r = requests.get(f"{BASE_URL}/alerts", headers=headers)
    check(f"List returns 200 (got {r.status_code})", r.status_code == 200)
    check("At least 2 alerts exist", len(r.json()) >= 2)

    print("\n--- list alerts filtered by pending status ---")
    r = requests.get(f"{BASE_URL}/alerts?status_filter=pending", headers=headers)
    check(f"Filtered list returns 200 (got {r.status_code})", r.status_code == 200)

    print("\n--- ingest without auth token ---")
    r = requests.post(f"{BASE_URL}/alerts/ingest", json=alert_payload)
    check(f"No-token ingest returns 401 (got {r.status_code})", r.status_code == 401)

    print("\n--- malformed payload: missing required field ---")
    bad_payload = dict(alert_payload)
    del bad_payload["raw_log"]
    bad_payload["alert_id"] = "alrt_bad_1"
    r = requests.post(f"{BASE_URL}/alerts/ingest", json=bad_payload, headers=headers)
    check(f"Missing required field returns 422 (got {r.status_code})", r.status_code == 422)

    print("\n--- malformed payload: invalid source enum value ---")
    bad_payload2 = dict(alert_payload)
    bad_payload2["alert_id"] = "alrt_bad_2"
    bad_payload2["source"] = "NOT_A_REAL_SOURCE"
    r = requests.post(f"{BASE_URL}/alerts/ingest", json=bad_payload2, headers=headers)
    check(f"Invalid enum value returns 422 (got {r.status_code})", r.status_code == 422)

    print("\nAll checks passed — alert ingestion is working end to end.")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("Could not connect to the server.")
        print(f"Make sure it's running at {BASE_URL} (uvicorn app.main:app --reload)")
        sys.exit(1)