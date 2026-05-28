import { api } from "./client";
import type { DeliveryDTO, DeliveryStatus, Page } from "@/types/api";

export interface DeliveryQuery {
  page?: number;
  size?: number;
  sort?: string;
  status?: DeliveryStatus;
  orderId?: number;
  pharmacyId?: number;
}

export async function getDeliveries(params: DeliveryQuery = {}): Promise<Page<DeliveryDTO>> {
  const { data } = await api.get<Page<DeliveryDTO>>("/api/deliveries", { params });
  return data;
}

export async function getDeliveriesByOrderId(orderId: number): Promise<DeliveryDTO[]> {
  const { data } = await api.get<DeliveryDTO[]>(`/api/deliveries/order/${orderId}`);
  return data;
}

export async function getDeliveriesByPharmacyId(pharmacyId: number): Promise<DeliveryDTO[]> {
  const { data } = await api.get<DeliveryDTO[]>(`/api/deliveries/pharmacy/${pharmacyId}`);
  return data;
}

export async function getDeliveriesByStatus(status: DeliveryStatus): Promise<DeliveryDTO[]> {
  const { data } = await api.get<DeliveryDTO[]>(`/api/deliveries/status/${status}`);
  return data;
}

export async function getDeliveryById(id: number): Promise<DeliveryDTO> {
  const { data } = await api.get<DeliveryDTO>(`/api/deliveries/${id}`);
  return data;
}
