import { apiFetch } from "./client";
import type { Alert } from "../types";

export function fetchAlerts(limit = 200): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/alerts?limit=${limit}`);
}
