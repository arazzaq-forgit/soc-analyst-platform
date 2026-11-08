const ACCESS_KEY = "aegis_access_token";
const REFRESH_KEY = "aegis_refresh_token";

export const AUTH_LOGOUT_EVENT = "aegis:logout";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the user will simply have to log in again
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // nothing to do
  }
}

export const getAccessToken = () => read(ACCESS_KEY);
export const getRefreshToken = () => read(REFRESH_KEY);
export const hasTokens = () => getAccessToken() !== null || getRefreshToken() !== null;

export function setTokens(access: string, refresh: string): void {
  write(ACCESS_KEY, access);
  write(REFRESH_KEY, refresh);
}

export function setAccessToken(access: string): void {
  write(ACCESS_KEY, access);
}

export function clearTokens(): void {
  remove(ACCESS_KEY);
  remove(REFRESH_KEY);
}
