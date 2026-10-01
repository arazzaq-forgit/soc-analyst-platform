"""
The alert-ingestion endpoint. This is the front door every SIEM/EDR/cloud
audit source sends alerts through, per /docs/alert-schema.md.

This is deliberately a SKELETON: it validates, normalizes, and stores an
alert, but does NOT yet call Ghouse's classifier or Razzaq's investigation
agent (those don't exist as callable services yet). Wiring those in is
future work once they're ready — this endpoint's job right now is just to
prove the ingestion pipe itself is solid.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.models_alert import Alert, TriageStatus
from app.models_audit import AuditLog
from app.schemas_alert import AlertIngest, AlertOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/ingest", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def ingest_alert(
    payload: AlertIngest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept one normalized alert and store it, pending triage.

    Auth-protected (not open to the public internet) — in production this
    will likely be called by an ingestion service/API key rather than an
    interactive user, but for now it reuses the same JWT dependency as
    everything else so there's exactly one auth mechanism in the system,
    not two half-built ones.
    """
    # Generate an ID if the source didn't provide one, per the schema doc.
    alert_id = payload.alert_id or f"alrt_{uuid.uuid4().hex[:12]}"

    alert = Alert(
        alert_id=alert_id,
        timestamp=payload.timestamp,
        source=payload.source,
        source_system=payload.source_system,
        severity_raw=payload.severity_raw,
        asset_id=payload.asset_id,
        asset_criticality=payload.asset_criticality,
        description=payload.description,
        mitre_technique=payload.mitre_technique,
        raw_log=payload.raw_log,
        related_alert_ids=payload.related_alert_ids,
        triage_status=TriageStatus.PENDING,
    )

    db.add(alert)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Alert with alert_id '{alert_id}' already exists.",
        )
    db.refresh(alert)

    # Audit trail: this is an AI-pipeline event (ingestion), not a human
    # action, hence actor_type="system" and no actor_user_id — the same
    # pattern used by the audit_logs schema design.
    audit = AuditLog(
        event_type="alert_ingested",
        actor_type="system",
        alert_id=alert.id,
        detail={"source": alert.source.value, "asset_id": alert.asset_id},
    )
    db.add(audit)
    db.commit()

    return alert


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single alert by its source-facing alert_id (not the internal DB id)."""
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("", response_model=list[AlertOut])
def list_alerts(
    status_filter: TriageStatus | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List alerts, optionally filtered by triage_status (e.g. ?status_filter=pending)."""
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.triage_status == status_filter)
    return query.order_by(Alert.timestamp.desc()).all()