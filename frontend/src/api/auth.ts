import { apiFetch } from "./client";
import type { TokenPair, User } from "../types";

export function loginRequest(email: string, password: string): Promise<TokenPair> {
  return apiFetch<TokenPair>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function fetchMe(): Promise<User> {
  return apiFetch<User>("/auth/me");
}
