from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models_alert import AlertSource, AssetCriticality, TriageStatus


class AlertIngest(BaseModel):
    """
    Shape of an incoming alert, matching /docs/alert-schema.md exactly.

    alert_id is optional on input: sources that don't provide one get an
    ID generated at ingestion (per the schema doc's own wording — "Unique
    ID, generated at ingestion if the source doesn't provide one").
    """

    alert_id: Optional[str] = Field(default=None, description="Source-provided ID, or auto-generated if omitted")
    timestamp: datetime
    source: AlertSource
    source_system: Optional[str] = None
    severity_raw: str
    asset_id: str
    asset_criticality: Optional[AssetCriticality] = AssetCriticality.UNKNOWN
    description: str
    mitre_technique: Optional[str] = None
    raw_log: str
    related_alert_ids: list[str] = Field(default_factory=list)


class AlertOut(BaseModel):
    """What we hand back after ingesting an alert — confirms what was stored."""

    id: int
    alert_id: str
    timestamp: datetime
    source: AlertSource
    asset_id: str
    triage_status: TriageStatus
    false_positive_score: Optional[float] = None

    class Config:
        from_attributes = True