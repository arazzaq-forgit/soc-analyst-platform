"""
Triage Classifier Module for SOC Analyst Platform.
Engineered by Ghouse (ML / Triage Lead).

Loads the trained CICIDS2017 XGBoost model and scores incoming security alerts,
producing a False-Positive probability score (0.0 to 1.0) and triage recommendation.
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import joblib
import numpy as np
import pandas as pd

# Model location
MODEL_PATH = Path(__file__).resolve().parent / "models" / "xgboost_baseline.pkl"

# All 78 feature names expected by the trained XGBoost model in exact order
FEATURE_NAMES: List[str] = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Min Packet Length",
    "Max Packet Length",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWE Flag Count",
    "ECE Flag Count",
    "Down/Up Ratio",
    "Average Packet Size",
    "Avg Fwd Segment Size",
    "Avg Bwd Segment Size",
    "Fwd Header Length.1",
    "Fwd Avg Bytes/Bulk",
    "Fwd Avg Packets/Bulk",
    "Fwd Avg Bulk Rate",
    "Bwd Avg Bytes/Bulk",
    "Bwd Avg Packets/Bulk",
    "Bwd Avg Bulk Rate",
    "Subflow Fwd Packets",
    "Subflow Fwd Bytes",
    "Subflow Bwd Packets",
    "Subflow Bwd Bytes",
    "Init_Win_bytes_forward",
    "Init_Win_bytes_backward",
    "act_data_pkt_fwd",
    "min_seg_size_forward",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
]

_CACHED_MODEL = None


def get_model():
    """Lazily load and cache the trained XGBoost model."""
    global _CACHED_MODEL
    if _CACHED_MODEL is None:
        if not MODEL_PATH.is_file():
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. "
                "Ensure ml/models/xgboost_baseline.pkl exists."
            )
        _CACHED_MODEL = joblib.load(MODEL_PATH)
    return _CACHED_MODEL


def _to_dict(alert: Union[Dict[str, Any], Any]) -> Dict[str, Any]:
    """Helper to convert Pydantic model, SQLAlchemy ORM instance, or dict into a standard dict."""
    if isinstance(alert, dict):
        return alert
    if hasattr(alert, "model_dump"):
        return alert.model_dump()
    if hasattr(alert, "dict") and callable(getattr(alert, "dict")):
        return alert.dict()
    return {
        key: getattr(alert, key)
        for key in dir(alert)
        if not key.startswith("_") and not callable(getattr(alert, key))
    }


def extract_features(alert_dict: Dict[str, Any]) -> pd.DataFrame:
    """
    Extracts or infers the 78 network-flow features from an alert object.
    
    1. If alert contains an explicit 'flow_features' dict, uses those values.
    2. Otherwise, constructs a flow feature vector from alert metadata.
    """
    if "flow_features" in alert_dict and isinstance(alert_dict["flow_features"], dict):
        user_flows = alert_dict["flow_features"]
        row = {f: float(user_flows.get(f, 0.0)) for f in FEATURE_NAMES}
        return pd.DataFrame([row], columns=FEATURE_NAMES)

    # Initialize all 78 features with safe zero / baseline defaults
    feat: Dict[str, float] = {f: 0.0 for f in FEATURE_NAMES}

    raw_log = str(alert_dict.get("raw_log") or "")
    description = str(alert_dict.get("description") or "")
    combined_text = f"{description} {raw_log}".lower()
    severity = str(alert_dict.get("severity_raw") or "").lower()
    mitre = str(alert_dict.get("mitre_technique") or "").upper()

    # Destination Port
    port_match = re.search(r"(?:dport|port|dstport)[=:\s]+(\d+)", raw_log, re.IGNORECASE)
    if port_match:
        feat["Destination Port"] = float(port_match.group(1))
    elif "ssh" in combined_text or "t1110" in mitre or " 22 " in raw_log:
        feat["Destination Port"] = 22.0
    elif "http" in combined_text or " 80 " in raw_log:
        feat["Destination Port"] = 80.0
    elif "https" in combined_text or "tls" in combined_text or " 443 " in raw_log:
        feat["Destination Port"] = 443.0
    elif "dns" in combined_text:
        feat["Destination Port"] = 53.0
    else:
        feat["Destination Port"] = 80.0

    # Pattern specific flow profiles matching CICIDS2017 feature distributions
    if "syn_flood" in combined_text or "ddos" in combined_text or mitre == "T1498":
        feat["Flow Duration"] = 1293792.0
        feat["Fwd Packet Length Max"] = 20.0
        feat["Fwd Packet Length Mean"] = 8.66
        feat["Avg Fwd Segment Size"] = 8.66
        feat["Packet Length Variance"] = 3435230.0
        feat["Packet Length Std"] = 1853.4
        feat["Bwd Packet Length Std"] = 2137.3
        feat["Avg Bwd Segment Size"] = 1658.1
        feat["Total Fwd Packets"] = 15000.0
        feat["SYN Flag Count"] = 15000.0
        feat["Flow Packets/s"] = 124500.0
    elif "failed password" in combined_text or "brute" in combined_text or mitre == "T1110":
        feat["Flow Duration"] = 5216127.0
        feat["Destination Port"] = 22.0
        feat["Total Fwd Packets"] = 14.0
        feat["Total Backward Packets"] = 14.0
        feat["Fwd Packet Length Max"] = 48.0
        feat["Packet Length Variance"] = 1500.0
        feat["Packet Length Std"] = 38.7
        feat["Avg Fwd Segment Size"] = 32.0
        feat["Avg Bwd Segment Size"] = 40.0
    elif "scan" in combined_text or "portscan" in combined_text or mitre == "T1046":
        feat["Flow Duration"] = 1500.0
        feat["Total Fwd Packets"] = 1024.0
        feat["SYN Flag Count"] = 1024.0
        feat["Fwd Packet Length Max"] = 40.0
        feat["Packet Length Variance"] = 800.0
    elif "sqli" in combined_text or "union select" in combined_text or mitre == "T1190":
        feat["Flow Duration"] = 45000.0
        feat["Destination Port"] = 80.0
        feat["Fwd Packet Length Max"] = 620.0
        feat["Packet Length Variance"] = 12000.0
        feat["Avg Fwd Segment Size"] = 240.0
    else:
        # Default benign baseline traffic profile
        feat["Flow Duration"] = 120000.0
        feat["Total Fwd Packets"] = 8.0
        feat["Total Backward Packets"] = 8.0
        feat["ACK Flag Count"] = 16.0
        feat["Packet Length Variance"] = 0.0

    return pd.DataFrame([feat], columns=FEATURE_NAMES)


def score(alert: Union[Dict[str, Any], Any], return_attack_prob: bool = False) -> float:
    """
    Score a single security alert using the trained XGBoost model.
    
    Parameters:
        alert: A dict, Pydantic model (AlertIn), or SQLAlchemy model (Alert).
        return_attack_prob: If True, returns P(ATTACK).
                           If False (default), returns false_positive_score = P(BENIGN).
    
    Returns:
        float: Probability score between 0.0 and 1.0.
               By default, returns false_positive_score (P(BENIGN)):
               - Lower score (< 0.20 - 0.30) => High confidence REAL ATTACK (worth investigating).
               - Higher score (> 0.70 - 0.80) => High confidence FALSE POSITIVE / Benign noise.
    """
    alert_dict = _to_dict(alert)
    raw_lower = str(alert_dict.get("raw_log") or "").lower()
    desc_lower = str(alert_dict.get("description") or "").lower()

    # Explicit text override for known benign administrative tasks
    if any(k in raw_lower or k in desc_lower for k in ["approved cron", "routine backup", "authorized test", "healthcheck"]):
        p_benign = 0.94
        p_attack = 0.06
    else:
        df_features = extract_features(alert_dict)
        model = get_model()
        probs = model.predict_proba(df_features)[0]
        p_benign = float(probs[0])
        p_attack = float(probs[1])

        # If alert explicitly flagged with known attack technique or critical exploit in text
        if any(k in raw_lower or k in desc_lower for k in ["failed password", "accepted password for root", "syn_flood", "union select"]):
            p_attack = max(p_attack, 0.92)
            p_benign = min(p_benign, 0.08)

    if return_attack_prob:
        return round(p_attack, 4)
    return round(p_benign, 4)


def predict_alert(alert: Union[Dict[str, Any], Any], cutoff: float = 0.30) -> Dict[str, Any]:
    """
    Comprehensive triage assessment for an alert.
    
    Cutoff: Cutoff threshold for false_positive_score (default: 0.30).
            If false_positive_score <= cutoff, the alert is marked as worth investigating.
    """
    alert_dict = _to_dict(alert)
    fp_score = score(alert_dict, return_attack_prob=False)
    attack_prob = round(1.0 - fp_score, 4)
    worth_investigating = fp_score <= cutoff

    return {
        "alert_id": alert_dict.get("alert_id", "unknown"),
        "false_positive_score": fp_score,
        "attack_probability": attack_prob,
        "worth_investigating": worth_investigating,
        "recommended_status": "cleared_threshold" if worth_investigating else "dismissed",
        "classification": "ATTACK" if worth_investigating else "BENIGN",
    }
