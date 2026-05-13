import { api } from "./client";
import type { UserDTO } from "@/types/api";

export async function getUserById(id: number): Promise<UserDTO> {
  const { data } = await api.get<UserDTO>(`/api/users/${id}`);
  return data;
}
