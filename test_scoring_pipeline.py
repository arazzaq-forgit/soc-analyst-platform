import uuid
from types import SimpleNamespace
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_db, get_current_user
from app import scoring
from app.models_alert import Alert, TriageStatus
from app.models_audit import AuditLog


def _payload():
    return {
        "alert_id": "alrt_sctest_" + uuid.uuid4().hex[:8],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "SIEM",
        "severity_raw": "high",
        "asset_id": "host-sctest",
        "description": "scoring pipeline test",
        "raw_log": "test raw log",
    }


def test_scoring_pipeline():
    db = next(get_db())
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=None)
    client = TestClient(app)
    real = scoring._real_scorer
    orig_flag = scoring.settings.auto_dismiss_enabled
    created = []

    def run(fake, expect_status, expect_score):
        scoring._real_scorer = fake
        p = _payload()
        r = client.post("/alerts/ingest", json=p)
        assert r.status_code == 201, r.text
        created.append(p["alert_id"])
        db.expire_all()
        a = db.query(Alert).filter(Alert.alert_id == p["alert_id"]).first()
        assert a.triage_status == expect_status, (a.triage_status, expect_status)
        assert a.false_positive_score == expect_score, a.false_positive_score
        n = db.query(AuditLog).filter(
            AuditLog.alert_id == a.id, AuditLog.event_type == "alert_scored").count()
        assert n == 1, n

    def boom(alert):
        raise RuntimeError("model missing")

    try:
        scoring.settings.auto_dismiss_enabled = False
        run(lambda a: 0.10, TriageStatus.CLEARED_THRESHOLD, 0.10)
        run(lambda a: 0.50, TriageStatus.PENDING, 0.50)
        run(lambda a: 0.90, TriageStatus.PENDING, 0.90)
        run(boom, TriageStatus.PENDING, None)
        scoring.settings.auto_dismiss_enabled = True
        run(lambda a: 0.90, TriageStatus.DISMISSED, 0.90)
    finally:
        scoring._real_scorer = real
        scoring.settings.auto_dismiss_enabled = orig_flag
        app.dependency_overrides.pop(get_current_user, None)
        for aid in created:
            a = db.query(Alert).filter(Alert.alert_id == aid).first()
            if a:
                db.query(AuditLog).filter(AuditLog.alert_id == a.id).delete()
                db.query(Alert).filter(Alert.id == a.id).delete()
        db.commit()
        db.close()


if __name__ == "__main__":
    test_scoring_pipeline()
    print("ALL SCORING PIPELINE TESTS PASSED")
