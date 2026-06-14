import { api } from "./client";
import type {
  InventoryDTO,
  InventorySummaryDTO,
  InventoryWritePayload,
  Page,
  PharmacyCreatePayload,
  PharmacyDTO,
} from "@/types/api";

export interface PharmacyQuery {
  page?: number;
  size?: number;
  sort?: string;
  name?: string;
  city?: string;
}

export async function getPharmacies(params: PharmacyQuery = {}): Promise<Page<PharmacyDTO>> {
  const { data } = await api.get<Page<PharmacyDTO>>("/api/pharmacies", { params });
  return data;
}

export async function getPharmacyById(id: number): Promise<PharmacyDTO> {
  const { data } = await api.get<PharmacyDTO>(`/api/pharmacies/${id}`);
  return data;
}

export async function createPharmacy(payload: PharmacyCreatePayload): Promise<PharmacyDTO> {
  const { data } = await api.post<PharmacyDTO>("/api/pharmacies", payload);
  return data;
}

export async function updatePharmacy(
  id: number,
  payload: PharmacyCreatePayload
): Promise<PharmacyDTO> {
  const { data } = await api.put<PharmacyDTO>(`/api/pharmacies/${id}`, payload);
  return data;
}

export async function deletePharmacy(id: number): Promise<void> {
  await api.delete(`/api/pharmacies/${id}`);
}

// ── Inventory ──────────────────────────────────────────────────────────────

export async function getInventoryForProduct(productId: number): Promise<InventoryDTO[]> {
  const { data } = await api.get<InventoryDTO[]>(`/api/inventory/product/${productId}`);
  return data;
}

export async function getProductInventorySummary(
  productIds: number[]
): Promise<InventorySummaryDTO[]> {
  if (productIds.length === 0) return [];
  const { data } = await api.get<InventorySummaryDTO[]>("/api/inventory/product-summary", {
    params: { productIds: productIds.join(",") },
  });
  return data;
}

export async function getInventoryForPharmacy(pharmacyId: number): Promise<InventoryDTO[]> {
  const { data } = await api.get<InventoryDTO[]>(`/api/inventory/pharmacy/${pharmacyId}`);
  return data;
}

export async function createInventory(payload: InventoryWritePayload): Promise<InventoryDTO> {
  const { data } = await api.post<InventoryDTO>("/api/inventory", payload);
  return data;
}

export async function updateInventory(
  id: number,
  payload: InventoryWritePayload
): Promise<InventoryDTO> {
  const { data } = await api.put<InventoryDTO>(`/api/inventory/${id}`, payload);
  return data;
}

export async function deleteInventory(id: number): Promise<void> {
  await api.delete(`/api/inventory/${id}`);
}
