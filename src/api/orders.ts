import { api } from "./client";
import type { OrderDTO, Page } from "@/types/api";

export async function getOrdersForUser(userId: number): Promise<OrderDTO[]> {
  const { data } = await api.get<OrderDTO[]>(`/api/orders/user/${userId}`);
  return data;
}

export async function getOrders(params: { page?: number; size?: number; sort?: string; userId?: number; status?: string } = {}): Promise<Page<OrderDTO>> {
  const { data } = await api.get<Page<OrderDTO>>("/api/orders", { params });
  return data;
}
