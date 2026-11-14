from types import SimpleNamespace
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_db, get_current_user
from app.routers import investigations as inv
from app.models_alert import Alert, TriageStatus
from app.models_investigation import Investigation, InvestigationStatus
from app.models_audit import AuditLog

FAKE_BRIEF = (
    "**SUMMARY**  \nBrute force.\n\n"
    "**SEVERITY ASSESSMENT**  \nHigh \u2013 every alert is high severity.\n\n"
    "**EVIDENCE**  \n- Failed logins [alrt_1, alrt_2].\n\n"
    "**RECOMMENDED ACTION**  \nReview logs."
)
FAKE_CONTEXT = [
    {"alert_id": "alrt_1", "text": "t1", "mitre_technique": "T1110", "severity": "high"},
    {"alert_id": "alrt_2", "text": "t2", "mitre_technique": "T1110", "severity": "high"},
]


def test_extract_severity():
    assert inv._extract_severity(FAKE_BRIEF) == "High"
    assert inv._extract_severity("**SEVERITY ASSESSMENT**\nmedium - x") == "Medium"
    assert inv._extract_severity("no section here") == "unknown"


def _free_alerts(db, n):
    out = []
    for a in db.query(Alert).all():
        if not db.query(Investigation).filter(Investigation.alert_id == a.id).first():
            out.append(a)
        if len(out) == n:
            return out
    raise AssertionError(f"need {n} alerts without an investigation in dev.db")


def _cleanup(db, alert, original):
    db.query(Investigation).filter(Investigation.alert_id == alert.id).delete()
    db.query(AuditLog).filter(AuditLog.alert_id == alert.id, AuditLog.event_type == "investigation_completed").delete()
    alert.triage_status = original
    db.commit()


def test_investigation_flow():
    db = next(get_db())
    ok_alert, bad_alert = _free_alerts(db, 2)
    ok_id, bad_id = ok_alert.alert_id, bad_alert.alert_id
    ok_orig, bad_orig = ok_alert.triage_status, bad_alert.triage_status

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=None)
    real_agent = inv.run_investigation
    client = TestClient(app)
    try:
        # unknown alert -> 404
        assert client.post("/investigate/does_not_exist").status_code == 404

        # success path
        inv.run_investigation = lambda q: (FAKE_BRIEF, FAKE_CONTEXT)
        r = client.post(f"/investigate/{ok_id}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "completed"
        assert body["severity"] == "High"
        assert body["citations"] == [
            {"alert_id": "alrt_1", "mitre_technique": "T1110", "severity": "high"},
            {"alert_id": "alrt_2", "mitre_technique": "T1110", "severity": "high"},
        ]
        db.expire_all()
        assert db.query(Alert).filter(Alert.alert_id == ok_id).first().triage_status == TriageStatus.RESOLVED
        assert db.query(AuditLog).filter(AuditLog.alert_id == ok_alert.id, AuditLog.event_type == "investigation_completed").count() == 1

        # duplicate -> 400
        assert client.post(f"/investigate/{ok_id}").status_code == 400

        # GET returns the stored result
        g = client.get(f"/investigate/{ok_id}")
        assert g.status_code == 200 and g.json()["severity"] == "High"

        # failure path: agent crashes -> 500, investigation FAILED, alert back to PENDING
        def boom(q):
            raise RuntimeError("agent down")
        inv.run_investigation = boom
        r = client.post(f"/investigate/{bad_id}")
        assert r.status_code == 500
        db.expire_all()
        bad = db.query(Alert).filter(Alert.alert_id == bad_id).first()
        assert bad.triage_status == TriageStatus.PENDING
        row = db.query(Investigation).filter(Investigation.alert_id == bad.id).first()
        assert row.status == InvestigationStatus.FAILED
    finally:
        inv.run_investigation = real_agent
        app.dependency_overrides.pop(get_current_user, None)
        db.expire_all()
        _cleanup(db, db.query(Alert).filter(Alert.alert_id == ok_id).first(), ok_orig)
        _cleanup(db, db.query(Alert).filter(Alert.alert_id == bad_id).first(), bad_orig)
        db.close()


if __name__ == "__main__":
    test_extract_severity()
    test_investigation_flow()
    print("ALL INVESTIGATION TESTS PASSED")
