const DEFAULT_API_URL = "http://127.0.0.1:8000";

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_URL;
