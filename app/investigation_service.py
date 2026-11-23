from datetime import datetime, timezone

from app.models_alert import TriageStatus
from app.models_audit import AuditLog
from app.models_investigation import Investigation, InvestigationStatus
from app.routers import investigations as inv


def begin(db, alert):
    row = Investigation(alert_id=alert.id, status=InvestigationStatus.IN_PROGRESS)
    alert.triage_status = TriageStatus.INVESTIGATING
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def finish(db, alert, row, brief, context, user_id):
    row.incident_brief = brief
    row.citations = [
        {"alert_id": c["alert_id"], "mitre_technique": c["mitre_technique"], "severity": c["severity"]}
        for c in context
    ]
    row.timeline = [{"alert_id": c["alert_id"], "text": c["text"]} for c in context]
    row.severity = inv._extract_severity(brief)
    row.confidence_score = row.severity
    row.status = InvestigationStatus.COMPLETED
    row.completed_at = datetime.now(timezone.utc)
    alert.triage_status = TriageStatus.RESOLVED
    db.add(AuditLog(
        event_type="investigation_completed",
        actor_type="ai_agent",
        actor_user_id=user_id,
        alert_id=alert.id,
        detail={"alert_id": alert.alert_id, "citation_count": len(context), "severity": row.severity},
    ))
    db.commit()


def fail(db, alert, row):
    row.status = InvestigationStatus.FAILED
    alert.triage_status = TriageStatus.PENDING
    db.commit()
