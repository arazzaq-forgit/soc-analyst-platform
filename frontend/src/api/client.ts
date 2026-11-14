import { API_URL } from "../lib/config";
import {
  AUTH_LOGOUT_EVENT,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "../lib/tokens";
import type { AccessTokenOnly } from "../types";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

const NETWORK_MESSAGE = "Cannot reach the server. Is the backend running on port 8000?";

async function toApiError(res: Response): Promise<ApiError> {
  let detail = `Request failed (${res.status})`;
  try {
    const data = (await res.json()) as {
      detail?: unknown;
      error?: unknown;
    };
    if (typeof data.detail === "string") {
      detail = data.detail;
    } else if (Array.isArray(data.detail)) {
      detail = data.detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : "Invalid input"))
        .join("; ");
    } else if (typeof data.error === "string") {
      detail = data.error;
    }
  } catch {
    // response had no JSON body
  }
  return new ApiError(res.status, detail);
}

let refreshPromise: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(false);

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as AccessTokenOnly;
        setAccessToken(data.access_token);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export function forceLogout(): void {
  clearTokens();
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const send = (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = getAccessToken();
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        res = await send();
      } catch {
        throw new ApiError(0, NETWORK_MESSAGE);
      }
    }
    if (!refreshed || res.status === 401) {
      forceLogout();
    }
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

