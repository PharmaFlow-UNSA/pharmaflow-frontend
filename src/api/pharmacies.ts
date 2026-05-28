import { api } from "./client";
import type {
  InventoryDTO,
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

// ── Inventory ──────────────────────────────────────────────────────────────

export async function getInventoryForProduct(productId: number): Promise<InventoryDTO[]> {
  const { data } = await api.get<InventoryDTO[]>(`/api/inventory/product/${productId}`);
  return data;
}

export async function getInventoryForPharmacy(pharmacyId: number): Promise<InventoryDTO[]> {
  const { data } = await api.get<InventoryDTO[]>(`/api/inventory/pharmacy/${pharmacyId}`);
  return data;
}
