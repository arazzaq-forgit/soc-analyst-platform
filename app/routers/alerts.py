"""
The alert-ingestion endpoint. This is the front door every SIEM/EDR/cloud
audit source sends alerts through, per /docs/alert-schema.md.

This is deliberately a SKELETON: it validates, normalizes, and stores an
alert, but does NOT yet call Ghouse's classifier or Razzaq's investigation
agent (those don't exist as callable services yet).
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
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("", response_model=list[AlertOut])
def list_alerts(
    status_filter: TriageStatus | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.triage_status == status_filter)
    return query.order_by(Alert.timestamp.desc()).limit(limit).all()
