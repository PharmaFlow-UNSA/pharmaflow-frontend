import { api } from "./client";
import type { Page, UserDTO, UpdateUserPayload } from "@/types/api";

export interface UserQuery {
  page?: number;
  size?: number;
  sort?: string;
  emailDomain?: string;
}

export async function getUsers(params: UserQuery = {}): Promise<Page<UserDTO>> {
  const { data } = await api.get<Page<UserDTO>>("/api/users", { params });
  return data;
}

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
