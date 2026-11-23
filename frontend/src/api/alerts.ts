import { apiFetch } from "./client";
import type { Alert, AlertSource, AssetCriticality } from "../types";

export interface AlertIngestPayload {
  alert_id?: string;
  timestamp: string;
  source: AlertSource;
  source_system: string | null;
  severity_raw: string;
  asset_id: string;
  asset_criticality: AssetCriticality;
  description: string;
  mitre_technique: string | null;
  raw_log: string;
  related_alert_ids: string[];
}

export function fetchAlerts(limit = 200): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/alerts?limit=${limit}`);
}

export function fetchAlert(alertId: string): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${encodeURIComponent(alertId)}`);
}

export function ingestAlert(payload: AlertIngestPayload): Promise<Alert> {
  return apiFetch<Alert>("/alerts/ingest", { method: "POST", body: payload });
}
