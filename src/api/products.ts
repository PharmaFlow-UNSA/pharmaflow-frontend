import { api } from "./client";
import type {
  Page,
  ProductDTO,
  CategoryDTO,
  SubstanceDTO,
  DrugInteractionDTO,
  ContraindicationDTO,
  ProductSubstituteDTO,
  ProductCreatePayload,
  CategoryCreatePayload,
} from "@/types/api";

// ── Query params ─────────────────────────────────────────────────────────────

export interface ProductQuery {
  page?: number;
  size?: number;
  sort?: string;
  name?: string;
  manufacturer?: string;
  productType?: string;
  requiresPrescription?: boolean;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: number;
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(q: ProductQuery = {}): Promise<Page<ProductDTO>> {
  const { data } = await api.get<Page<ProductDTO>>("/api/products/page", { params: q });
  return data;
}

export async function getProductById(id: number): Promise<ProductDTO> {
  const { data } = await api.get<ProductDTO>(`/api/products/${id}`);
  return data;
}

export async function getProductsByPriceRange(
  minPrice: number,
  maxPrice: number
): Promise<ProductDTO[]> {
  const { data } = await api.get<ProductDTO[]>("/api/products/price-range", {
    params: { minPrice, maxPrice },
  });
  return data;
}

export async function getOtcProducts(): Promise<ProductDTO[]> {
  const { data } = await api.get<ProductDTO[]>("/api/products/otc");
  return data;
}

export async function getProductCountByType(): Promise<Record<string, number>> {
  const { data } = await api.get<Record<string, number>>("/api/products/stats/count-by-type");
  return data;
}

export async function createProduct(payload: ProductCreatePayload): Promise<ProductDTO> {
  const { data } = await api.post<ProductDTO>("/api/products", payload);
  return data;
}

export async function updateProduct(
  id: number,
  payload: ProductCreatePayload
): Promise<ProductDTO> {
  const { data } = await api.put<ProductDTO>(`/api/products/${id}`, payload);
  return data;
}

export async function deactivateProduct(id: number): Promise<void> {
  await api.patch(`/api/products/${id}/deactivate`);
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/api/products/${id}`);
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryDTO[]> {
  const { data } = await api.get<CategoryDTO[]>("/api/categories");
  return data;
}

export async function createCategory(payload: CategoryCreatePayload): Promise<CategoryDTO> {
  const { data } = await api.post<CategoryDTO>("/api/categories", payload);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/api/categories/${id}`);
}

// ── Substances ────────────────────────────────────────────────────────────────

export async function getSubstances(): Promise<SubstanceDTO[]> {
  const { data } = await api.get<SubstanceDTO[]>("/api/substances");
  return data;
}

// ── Drug Interactions ─────────────────────────────────────────────────────────

export async function getDrugInteractions(): Promise<DrugInteractionDTO[]> {
  const { data } = await api.get<DrugInteractionDTO[]>("/api/interactions");
  return data;
}

// ── Contraindications ─────────────────────────────────────────────────────────

export async function getContraindications(): Promise<ContraindicationDTO[]> {
  const { data } = await api.get<ContraindicationDTO[]>("/api/contraindications");
  return data;
}

// ── Substitutes ───────────────────────────────────────────────────────────────

export async function getSubstitutesForProduct(
  productId: number
): Promise<ProductSubstituteDTO[]> {
  const { data } = await api.get<ProductSubstituteDTO[]>(
    `/api/substitutes/product/${productId}`
  );
  return data;
}

export interface DrugInteractionPayload {
  substanceAId: number;
  substanceBId: number;
  severity: string;
  description: string;
  clinicalRecommendation?: string;
}

export async function createDrugInteraction(
  payload: DrugInteractionPayload
): Promise<import("@/types/api").DrugInteractionDTO> {
  const { data } = await api.post<import("@/types/api").DrugInteractionDTO>(
    "/api/interactions",
    payload
  );
  return data;
}

export async function deleteDrugInteraction(id: number): Promise<void> {
  await api.delete(`/api/interactions/${id}`);
}
