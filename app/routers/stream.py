"""
Server-Sent Events (SSE) streaming for incident briefs.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.models_alert import Alert
from app.mock_investigation import generate_mock_investigation

router = APIRouter(prefix="/stream", tags=["stream"])


async def sse_event_stream(alert_id: str):
    async for chunk in generate_mock_investigation(alert_id):
        safe_chunk = chunk.replace("\n", "\\n")
        yield f"data: {safe_chunk}\n\n"

    yield "event: done\ndata: \n\n"


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
        sse_event_stream(alert_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )