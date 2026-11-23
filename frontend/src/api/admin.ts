import { apiFetch } from "./client";
import type { Role, User } from "../types";

export function fetchUsers(): Promise<User[]> {
  return apiFetch<User[]>("/admin/users");
}

export function updateUserRole(userId: number, role: Role): Promise<User> {
  return apiFetch<User>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });
}
