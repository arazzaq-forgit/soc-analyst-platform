export type AlertSource = 'SIEM' | 'EDR' | 'cloud_audit';

export type AssetCriticality = 'low' | 'medium' | 'high' | 'unknown';

export type TriageStatus = 'pending' | 'cleared_threshold' | 'investigating' | 'resolved' | 'dismissed';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export type UserRole = 'analyst' | 'admin';

export interface Alert {
  id: number;
  alert_id: string;
  timestamp: string;
  source: AlertSource;
  source_system?: string;
  severity_raw: string;
  asset_id: string;
  source_ip?: string;
  asset_criticality: AssetCriticality;
  description: string;
  mitre_technique?: string;
  raw_log: string;
  related_alert_ids: string[];
  false_positive_score?: number; // 0.0 - 1.0 (from Ghouse ML classifier)
  triage_status: TriageStatus;
  created_at: string;
}

export interface CitationItem {
  alert_id?: string;
  claim?: string;
  raw_log_reference?: string;
  mitre_technique?: string;
  severity?: string;
}

export interface TimelineItem {
  time?: string;
  event?: string;
  alert_id?: string;
  text?: string;
}

export interface Investigation {
  investigation_id: number;
  alert_id: string;
  status: 'in_progress' | 'completed' | 'failed';
  incident_brief?: string;
  citations: CitationItem[];
  timeline: TimelineItem[];
  confidence_score?: string; // Low, Medium, High, Critical
  created_at: string;
  completed_at?: string;
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuditLog {
  id: number;
  event_type: 'alert_ingested' | 'triage_score' | 'investigation_completed' | 'role_update' | string;
  actor_type: 'user' | 'system' | 'ai_agent';
  actor_user_id?: number;
  alert_id?: number;
  detail: Record<string, any>;
  created_at: string;
}

export interface MLMetrics {
  model: string;
  dataset: string;
  sample_size: number;
  features: number;
  accuracy: number;
  benign_precision: number;
  benign_recall: number;
  benign_f1: number;
  attack_precision: number;
  attack_recall: number;
  attack_f1: number;
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
}
