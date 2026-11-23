"""
Test for SSE streaming (/stream/{alert_id}).
"""

import sys
import time

import requests

BASE_URL = "http://127.0.0.1:8000"


def check(label: str, condition: bool):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    if not condition:
        sys.exit(1)


def main():
    at = chr(64)
    email = "sse.test" + at + "example.com"
    password = "testpass123"

    requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password})
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    requests.post(
        f"{BASE_URL}/alerts/ingest",
        json={
            "alert_id": "alrt_sse_test",
            "timestamp": "2026-08-03T14:32:10Z",
            "source": "SIEM",
            "severity_raw": "high",
            "asset_id": "host-web-03",
            "description": "Test alert for SSE streaming",
            "raw_log": "test log line",
        },
        headers=headers,
    )

    print("Streaming /stream/alrt_sse_test and timing each chunk...\n")

    start = time.time()
    chunk_times = []
    full_text = ""
    content_type = None
    done_received = False

    with requests.get(f"{BASE_URL}/stream/alrt_sse_test", headers=headers, stream=True) as r:
        content_type = r.headers.get("content-type", "")
        check(f"Response status is 200 (got {r.status_code})", r.status_code == 200)

        for line in r.iter_lines(decode_unicode=True):
            if line and line.startswith("data:"):
                chunk_times.append(time.time() - start)
                full_text += line[len("data: "):].replace("\\n", "\n")
            if line and line.startswith("event: done"):
                done_received = True

    check("Content-Type is text/event-stream", "text/event-stream" in content_type)
    check("Received multiple chunks", len(chunk_times) > 5)
    check(
        "Chunks arrived over real time, not all at once "
        f"(span: {chunk_times[-1] - chunk_times[0]:.2f}s)",
        chunk_times[-1] - chunk_times[0] > 1.0,
    )
    check("A final 'done' event was received", done_received)
    check("Reassembled text contains the expected content", "Investigation complete" in full_text)

    print(f"\nReassembled streamed text:\n{full_text}\n")

    print("--- streaming a nonexistent alert ---")
    r = requests.get(f"{BASE_URL}/stream/does-not-exist", headers=headers)
    check(f"Nonexistent alert returns 404 (got {r.status_code})", r.status_code == 404)

    print("\n--- streaming without a token ---")
    r = requests.get(f"{BASE_URL}/stream/alrt_sse_test")
    check(f"No-token request returns 401 (got {r.status_code})", r.status_code == 401)

    print("\nAll checks passed — SSE streaming is working end to end.")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("Could not connect to the server.")
        print(f"Make sure it's running at {BASE_URL} (uvicorn app.main:app --reload)")
        sys.exit(1)