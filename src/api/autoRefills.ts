import { api } from "./client";
import type {
  AutoRefillCreatePayload,
  AutoRefillStatus,
  AutoRefillSubscriptionDTO,
  Page,
} from "@/types/api";

export interface AutoRefillQuery {
  page?: number;
  size?: number;
  sort?: string;
  userId?: number;
  status?: AutoRefillStatus;
  productId?: number;
}

const BASE = "/api/auto-refill-subscriptions";

export async function getAutoRefills(params: AutoRefillQuery = {}): Promise<Page<AutoRefillSubscriptionDTO>> {
  const { data } = await api.get<Page<AutoRefillSubscriptionDTO>>(BASE, { params });
  return data;
}

export async function getAutoRefillsForUser(userId: number): Promise<AutoRefillSubscriptionDTO[]> {
  const { data } = await api.get<AutoRefillSubscriptionDTO[]>(`${BASE}/user/${userId}`);
  return data;
}

export async function getAutoRefillById(id: number): Promise<AutoRefillSubscriptionDTO> {
  const { data } = await api.get<AutoRefillSubscriptionDTO>(`${BASE}/${id}`);
  return data;
}

export async function createAutoRefill(
  payload: AutoRefillCreatePayload
): Promise<AutoRefillSubscriptionDTO> {
  const { data } = await api.post<AutoRefillSubscriptionDTO>(BASE, payload);
  return data;
}

/** Pause/resume/cancel via JSON Patch on /status. */
export async function patchAutoRefillStatus(
  id: number,
  status: AutoRefillStatus
): Promise<AutoRefillSubscriptionDTO> {
  const patch = [{ op: "replace", path: "/status", value: status }];
  const { data } = await api.patch<AutoRefillSubscriptionDTO>(`${BASE}/${id}`, patch, {
    headers: { "Content-Type": "application/json-patch+json" },
  });
  return data;
}

export async function deleteAutoRefill(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}
