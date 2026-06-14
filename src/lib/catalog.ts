import type { ProductDTO } from "@/types/api";

export const PRODUCT_PLACEHOLDER = "/demo/products/placeholder.svg";
export const PHARMACY_PLACEHOLDER = "/demo/pharmacies/placeholder.svg";

export function formatPrice(price: number | undefined): string {
  return `${(price ?? 0).toFixed(2)} KM`;
}

export function getProductImage(product?: Pick<ProductDTO, "imageUrl">): string {
  return product?.imageUrl?.trim() || PRODUCT_PLACEHOLDER;
}

export function getPharmacyImage(imageUrl?: string): string {
  return imageUrl?.trim() || PHARMACY_PLACEHOLDER;
}

export function productTypeLabel(type?: string): string {
  if (!type) return "Product";
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
