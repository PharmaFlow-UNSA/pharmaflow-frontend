import { createContext } from "react";
import type { ProductDTO } from "@/types/api";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl?: string;
  requiresPrescription: boolean;
  quantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: ProductDTO, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);
