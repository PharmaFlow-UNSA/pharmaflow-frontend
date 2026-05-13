import { api } from "./client";
import type { Page, ProductDTO } from "@/types/api";

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
}

export async function getProducts(q: ProductQuery = {}): Promise<Page<ProductDTO>> {
  const { data } = await api.get<Page<ProductDTO>>("/api/products/page", { params: q });
  return data;
}

export async function getProductById(id: number): Promise<ProductDTO> {
  const { data } = await api.get<ProductDTO>(`/api/products/${id}`);
  return data;
}
