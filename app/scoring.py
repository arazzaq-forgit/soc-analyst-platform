import logging

from app.config import settings
from app.models_alert import TriageStatus

log = logging.getLogger(__name__)


def _real_scorer(alert):
    # Imported lazily so the app still starts if the model files or xgboost are missing.
    from ml.score import score
    return score(alert)


def compute_score(alert):
    """Return the false-positive score (0 to 1), or None if scoring failed."""
    try:
        return float(_real_scorer(alert))
    except Exception:
        log.exception("classifier scoring failed; alert stays pending")
        return None


def decide_status(score):
    """Low score = likely real attack = cleared threshold. Auto-dismiss is opt-in."""
    if score is None:
        return TriageStatus.PENDING
    if score <= settings.fp_cleared_cutoff:
        return TriageStatus.CLEARED_THRESHOLD
    if settings.auto_dismiss_enabled and score >= settings.fp_dismiss_cutoff:
        return TriageStatus.DISMISSED
    return TriageStatus.PENDING
