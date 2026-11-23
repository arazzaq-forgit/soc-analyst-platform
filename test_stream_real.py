import uuid
from types import SimpleNamespace
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_db, get_current_user
from app.routers import investigations as inv
from app.models_alert import Alert, AlertSource, TriageStatus
from app.models_audit import AuditLog
from app.models_investigation import Investigation, InvestigationStatus

BRIEF = ("**SUMMARY**  \nBrute force attack.\n\n**SEVERITY ASSESSMENT**  \n"
         "High \u2013 test.\n\n**EVIDENCE**  \n- Logins [alrt_1].\n\n"
         "**RECOMMENDED ACTION**  \nReview logs.")
CTX = [{"alert_id": "alrt_1", "text": "t", "mitre_technique": "T1110", "severity": "high"}]


def seed(db):
    a = Alert(alert_id="alrt_sttest_" + uuid.uuid4().hex[:8],
              timestamp=datetime.now(timezone.utc), source=AlertSource.SIEM,
              severity_raw="high", asset_id="host-sttest",
              description="stream test alert", raw_log="x")
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def body_text(body):
    return "".join(l[6:] for l in body.split("\n") if l.startswith("data: "))


def test_stream():
    db = next(get_db())
    a1, a2 = seed(db), seed(db)
    ids = [a1.id, a2.id]
    id1, id2 = a1.alert_id, a2.alert_id
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=None)
    real = inv.run_investigation
    client = TestClient(app)
    calls = []
    try:
        assert client.get("/stream/does_not_exist").status_code == 404

        def fake(q):
            calls.append(q)
            return BRIEF, CTX
        inv.run_investigation = fake
        r = client.get("/stream/" + id1)
        assert r.status_code == 200
        assert "event: done" in r.text
        assert "Brute force attack" in body_text(r.text).replace("\\n", " ")
        assert len(calls) == 1
        db.expire_all()
        assert db.query(Alert).filter(Alert.id == ids[0]).first().triage_status == TriageStatus.RESOLVED
        row = db.query(Investigation).filter(Investigation.alert_id == ids[0]).first()
        assert row.status == InvestigationStatus.COMPLETED and row.severity == "High"

        # replay: stored brief, agent not called again
        r = client.get("/stream/" + id1)
        assert "event: done" in r.text and len(calls) == 1

        # failure
        def boom(q):
            raise RuntimeError("down")
        inv.run_investigation = boom
        r = client.get("/stream/" + id2)
        assert "event: error" in r.text
        db.expire_all()
        assert db.query(Alert).filter(Alert.id == ids[1]).first().triage_status == TriageStatus.PENDING
    finally:
        inv.run_investigation = real
        app.dependency_overrides.pop(get_current_user, None)
        db.expire_all()
        for i in ids:
            db.query(Investigation).filter(Investigation.alert_id == i).delete()
            db.query(AuditLog).filter(AuditLog.alert_id == i).delete()
            db.query(Alert).filter(Alert.id == i).delete()
        db.commit()
        db.close()


if __name__ == "__main__":
    test_stream()
    print("ALL STREAM TESTS PASSED")
