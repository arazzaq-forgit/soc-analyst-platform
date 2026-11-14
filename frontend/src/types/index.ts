export type Role = "analyst" | "admin";

export type TriageStatus =
  | "pending"
  | "cleared_threshold"
  | "investigating"
  | "resolved"
  | "dismissed";

export type AlertSource = "SIEM" | "EDR" | "cloud_audit";

export type AssetCriticality = "low" | "medium" | "high" | "unknown";

export interface Alert {
  id: number;
  alert_id: string;
  timestamp: string;
  source: AlertSource;
  asset_id: string;
  source_system: string | null;
  severity_raw: string;
  asset_criticality: AssetCriticality | null;
  description: string;
  mitre_technique: string | null;
  triage_status: TriageStatus;
  false_positive_score: number | null;
}

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AccessTokenOnly {
  access_token: string;
  token_type: string;
}
