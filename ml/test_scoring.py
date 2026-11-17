"""
Verification test for ml/triage_classifier.py and ml/score.py
"""

from ml.triage_classifier import score, predict_alert

# Test Case 1: Razzaq's SSH Brute Force alert from docs/alert-schema.md
ssh_alert = {
    "alert_id": "alrt_8f3c1a2b",
    "timestamp": "2026-08-03T14:32:10Z",
    "source": "SIEM",
    "source_system": "Elastic Security",
    "severity_raw": "high",
    "asset_id": "host-web-03",
    "source_ip": "203.0.113.7",
    "description": "Multiple failed SSH login attempts followed by a successful login",
    "mitre_technique": "T1110",
    "raw_log": "2026-08-03T14:32:10Z sshd[2211]: Failed password for root from 203.0.113.7 port 51122 ssh2 (x7), then Accepted password for root from 203.0.113.7",
}

# Test Case 2: Volumetric SYN Flood DDoS alert
ddos_alert = {
    "alert_id": "alrt_57c0f997",
    "timestamp": "2026-08-03T15:10:42Z",
    "source": "EDR",
    "source_system": "CICIDS2017_Friday_Flows",
    "severity_raw": "critical",
    "asset_id": "edge-lb-01",
    "source_ip": "172.16.0.1",
    "description": "High-frequency DDoS SYN flood saturating external interface",
    "mitre_technique": "T1498",
    "raw_log": "kernel: [NETFILTER] SYN_FLOOD proto=TCP s=172.16.0.1 dport=80 pps=124500",
}

# Test Case 3: Benign operational routine backup
benign_alert = {
    "alert_id": "alrt_91b402ed",
    "timestamp": "2026-08-03T16:30:00Z",
    "source": "SIEM",
    "source_system": "Elastic Security",
    "severity_raw": "low",
    "asset_id": "backup-srv-01",
    "source_ip": "10.0.4.12",
    "description": "High volume outbound rsync file replication",
    "raw_log": "rsync[11902]: transfer 4.8GB via approved cron job 00_daily_backup to s3",
}

def run_tests():
    print("Testing ML Triage Classifier Scoring...\n")

    res_ssh = predict_alert(ssh_alert)
    print("1. SSH Brute Force:")
    print("   FP Score (P_BENIGN) :", res_ssh["false_positive_score"])
    print("   Attack Prob         :", res_ssh["attack_probability"])
    print("   Worth Investigating :", res_ssh["worth_investigating"])
    print("   Recommended Status  :", res_ssh["recommended_status"])
    assert res_ssh["worth_investigating"] == True, "SSH attack should be worth investigating"

    res_ddos = predict_alert(ddos_alert)
    print("\n2. SYN Flood DDoS:")
    print("   FP Score (P_BENIGN) :", res_ddos["false_positive_score"])
    print("   Attack Prob         :", res_ddos["attack_probability"])
    print("   Worth Investigating :", res_ddos["worth_investigating"])
    print("   Recommended Status  :", res_ddos["recommended_status"])
    assert res_ddos["worth_investigating"] == True, "DDoS attack should be worth investigating"

    res_benign = predict_alert(benign_alert)
    print("\n3. Benign Scheduled Backup:")
    print("   FP Score (P_BENIGN) :", res_benign["false_positive_score"])
    print("   Attack Prob         :", res_benign["attack_probability"])
    print("   Worth Investigating :", res_benign["worth_investigating"])
    print("   Recommended Status  :", res_benign["recommended_status"])
    assert res_benign["worth_investigating"] == False, "Benign backup should be dismissed"

    print("\nAll classifier scoring tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
