import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CartContext, type CartContextValue, type CartItem } from "./context";

const STORAGE_KEY = "pharmaflow.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    return {
      items,
      itemCount,
      subtotal,
      addItem: (product, quantity = 1) => {
        const safeQuantity = clampQuantity(quantity);
        setItems((current) => {
          const existing = current.find((item) => item.productId === product.id);
          if (existing) {
            return current.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: clampQuantity(item.quantity + safeQuantity), price: product.price }
                : item
            );
          }
          return [
            ...current,
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              requiresPrescription: product.requiresPrescription,
              quantity: safeQuantity,
            },
          ];
        });
      },
      updateQuantity: (productId, quantity) => {
        const nextQuantity = clampQuantity(quantity);
        setItems((current) =>
          current.map((item) =>
            item.productId === productId ? { ...item, quantity: nextQuantity } : item
          )
        );
      },
      removeItem: (productId) => {
        setItems((current) => current.filter((item) => item.productId !== productId));
      },
      clearCart: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CartItem => {
        return (
          typeof item?.productId === "number" &&
          typeof item?.name === "string" &&
          typeof item?.price === "number" &&
          typeof item?.requiresPrescription === "boolean" &&
          typeof item?.quantity === "number"
        );
      })
      .map((item) => ({ ...item, quantity: clampQuantity(item.quantity) }));
  } catch {
    return [];
  }
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(quantity)));
}
