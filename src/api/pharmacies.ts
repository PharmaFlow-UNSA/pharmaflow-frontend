import { api } from "./client";
import type { InventoryDTO, Page, PharmacyDTO } from "@/types/api";

export async function getPharmacies(params: { page?: number; size?: number; sort?: string; name?: string; city?: string } = {}): Promise<Page<PharmacyDTO>> {
  const { data } = await api.get<Page<PharmacyDTO>>("/api/pharmacies", { params });
  return data;
}

export async function getInventoryForProduct(productId: number): Promise<InventoryDTO[]> {
  const { data } = await api.get<InventoryDTO[]>(`/api/inventory/product/${productId}`);
  return data;
}
