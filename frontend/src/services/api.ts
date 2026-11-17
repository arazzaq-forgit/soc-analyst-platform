import type { Alert, Investigation, User, TokenPair } from '../types';

const API_BASE = ''; // Uses Vite proxy config to localhost:8000

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('aegis_access_token');
    this.refreshToken = localStorage.getItem('aegis_refresh_token');
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('aegis_access_token', access);
    localStorage.setItem('aegis_refresh_token', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('aegis_access_token');
    localStorage.removeItem('aegis_refresh_token');
  }

  getAccessToken() {
    return this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401 and refresh token available, attempt token rotation
    if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/refresh')) {
      const refreshed = await this.refreshTokenFlow();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    if (!response.ok) {
      let errorDetail = `Request failed: ${response.statusText}`;
      try {
        const body = await response.json();
        if (body.detail) errorDetail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch (_) {}
      throw new Error(errorDetail);
    }

    return response.json();
  }

  private async refreshTokenFlow(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access_token;
        localStorage.setItem('aegis_access_token', data.access_token);
        return true;
      }
    } catch (_) {}
    this.clearTokens();
    return false;
  }

  // Health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Auth Endpoints
  async register(email: string, password: string): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const tokens = await this.request<TokenPair>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Alerts Endpoints
  async getAlerts(limit: number = 50): Promise<Alert[]> {
    return this.request<Alert[]>(`/alerts?limit=${limit}`);
  }

  async getAlert(alertId: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${alertId}`);
  }

  async ingestAlert(alert: Partial<Alert>): Promise<Alert> {
    return this.request<Alert>('/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }

  // Investigation Endpoints
  async triggerInvestigation(alertId: string): Promise<Investigation> {
    return this.request<Investigation>(`/investigate/${alertId}`, {
      method: 'POST',
    });
  }

  async getInvestigation(alertId: string): Promise<Investigation> {
    return this.request<Investigation>(`/investigate/${alertId}`);
  }

  // Admin Endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users');
  }

  async updateUserRole(userId: number, role: 'analyst' | 'admin'): Promise<User> {
    return this.request<User>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }
}

export const api = new ApiClient();
