"""
Convenience alias for importing the scoring function.
Usage:
    from ml.score import score, predict_alert
"""

from ml.triage_classifier import score, predict_alert, extract_features, get_model, FEATURE_NAMES

__all__ = ["score", "predict_alert", "extract_features", "get_model", "FEATURE_NAMES"]
