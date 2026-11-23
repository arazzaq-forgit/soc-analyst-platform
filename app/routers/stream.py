"""
Server-Sent Events (SSE) stream for incident briefs. Runs the real agent,
saves the result, and replays a stored brief if one already exists.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import investigation_service as svc
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.models_alert import Alert, TriageStatus
from app.models_investigation import Investigation, InvestigationStatus
from app.routers import investigations as inv

router = APIRouter(prefix="/stream", tags=["stream"])

STALE_AFTER = timedelta(minutes=3)
CHUNK = 40
DELAY = 0.02


def _sse(text: str) -> str:
    return "data: " + text.replace("\n", "\\n") + "\n\n"


async def _send_text(text: str):
    for i in range(0, len(text), CHUNK):
        yield _sse(text[i:i + CHUNK])
        await asyncio.sleep(DELAY)


async def sse_event_stream(alert_id: str, user_id):
    db = next(get_db())
    try:
        alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
        if alert is None:
            yield "event: error\ndata: Alert not found\n\n"
            return

        row = db.query(Investigation).filter(Investigation.alert_id == alert.id).first()
        if row is not None and row.status == InvestigationStatus.FAILED:
            db.delete(row)
            db.commit()
            row = None

        if row is not None and row.status == InvestigationStatus.IN_PROGRESS:
            started = row.created_at
            if started is not None and started.tzinfo is None:
                started = started.replace(tzinfo=timezone.utc)
            if started is not None and datetime.now(timezone.utc) - started > STALE_AFTER:
                db.delete(row)
                alert.triage_status = TriageStatus.PENDING
                db.commit()
                row = None

        if row is not None and row.status == InvestigationStatus.IN_PROGRESS:
            yield "event: error\ndata: An investigation is already running for this alert\n\n"
            return

        if row is not None:
            async for piece in _send_text(row.incident_brief or ""):
                yield piece
            yield "event: done\ndata: \n\n"
            return

        row = svc.begin(db, alert)
        yield _sse("Investigating alert " + alert_id + "...\n\n")
        query = alert.description
        try:
            brief, context = await asyncio.to_thread(inv.run_investigation, query)
            svc.finish(db, alert, row, brief, context, user_id)
        except Exception:
            svc.fail(db, alert, row)
            yield "event: error\ndata: Investigation failed\n\n"
            return

        async for piece in _send_text(brief):
            yield piece
        yield "event: done\ndata: \n\n"
    finally:
        db.close()


@router.get("/{alert_id}")
async def stream_investigation(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return StreamingResponse(
        sse_event_stream(alert_id, getattr(current_user, "id", None)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
