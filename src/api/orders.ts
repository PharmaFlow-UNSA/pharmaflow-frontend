import { api } from "./client";
import type { OrderCreatePayload, OrderDTO, OrderStatus, Page } from "@/types/api";

export interface OrderQuery {
  page?: number;
  size?: number;
  sort?: string;
  userId?: number;
  status?: OrderStatus;
}

export async function getOrders(params: OrderQuery = {}): Promise<Page<OrderDTO>> {
  const { data } = await api.get<Page<OrderDTO>>("/api/orders", { params });
  return data;
}

export async function getOrdersForUser(userId: number): Promise<OrderDTO[]> {
  const { data } = await api.get<OrderDTO[]>(`/api/orders/user/${userId}`);
  return data;
}

export async function getOrderById(id: number): Promise<OrderDTO> {
  const { data } = await api.get<OrderDTO>(`/api/orders/${id}`);
  return data;
}

export async function createOrder(payload: OrderCreatePayload): Promise<OrderDTO> {
  const { data } = await api.post<OrderDTO>("/api/orders", payload);
  return data;
}

/**
 * Updates a single field via JSON Patch (RFC 6902). Backend route is
 * `PATCH /api/orders/{id}` with `application/json-patch+json` and a list of
 * operations like `[{ "op": "replace", "path": "/status", "value": "SHIPPED" }]`.
 */
export async function patchOrderStatus(id: number, status: OrderStatus): Promise<OrderDTO> {
  const patch = [{ op: "replace", path: "/status", value: status }];
  const { data } = await api.patch<OrderDTO>(`/api/orders/${id}`, patch, {
    headers: { "Content-Type": "application/json-patch+json" },
  });
  return data;
}

export async function deleteOrder(id: number): Promise<void> {
  await api.delete(`/api/orders/${id}`);
}
