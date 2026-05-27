import { api } from "./client";
import type { UserDTO, UpdateUserPayload } from "@/types/api";

export async function getUserById(id: number): Promise<UserDTO> {
  const { data } = await api.get<UserDTO>(`/api/users/${id}`);
  return data;
}

export async function getCurrentUser(): Promise<UserDTO> {
  const { data } = await api.get<UserDTO>("/api/users/me");
  return data;
}

export async function updateCurrentUser(payload: UpdateUserPayload): Promise<UserDTO> {
  const { data } = await api.put<UserDTO>("/api/users/me", payload);
  return data;
}
