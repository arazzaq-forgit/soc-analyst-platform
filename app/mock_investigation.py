"""
Mock incident-brief generator for prototyping SSE streaming.
"""

import asyncio


async def generate_mock_investigation(alert_id: str):
    chunks = [
        f"Investigating alert {alert_id}...\n\n",
        "## Summary\n",
        "A brute-force SSH attempt was detected against the affected host. ",
        "After 7 failed login attempts, a successful login occurred from ",
        "the same source IP, consistent with MITRE ATT&CK technique T1110 ",
        "(Brute Force).\n\n",
        "## Timeline\n",
        "- 14:32:10 UTC — 7 failed SSH login attempts recorded\n",
        "- 14:32:10 UTC — Successful login as root from the same IP\n\n",
        "## Citations\n",
        "- Claim: '7 failed login attempts' -> traced to raw_log field ",
        f"on alert {alert_id}\n",
        "- Claim: 'Successful root login' -> traced to raw_log field ",
        f"on alert {alert_id}\n\n",
        "Investigation complete.",
    ]

    for chunk in chunks:
        yield chunk
        await asyncio.sleep(0.3)