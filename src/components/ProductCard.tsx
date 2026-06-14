import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/cart/useCart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getProductImage, formatPrice, productTypeLabel } from "@/lib/catalog";
import type { InventorySummaryDTO, ProductDTO } from "@/types/api";

export function ProductCard({
  product,
  summary,
  compact = false,
}: {
  product: ProductDTO;
  summary?: InventorySummaryDTO;
  compact?: boolean;
}) {
  const cart = useCart();

  return (
    <article className="group flex h-full min-h-[30rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg">
      <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-50 to-brand-50/40">
        <Link to={`/products/${product.id}`} className="block">
          <div className="flex h-52 items-center justify-center p-6">
            <img
              src={getProductImage(product)}
              alt={product.name}
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
            />
          </div>
        </Link>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex min-h-6 flex-wrap items-center gap-2">
          {product.requiresPrescription ? (
            <Badge variant="warning">Rx</Badge>
          ) : (
            <Badge variant="success">OTC</Badge>
          )}
          {product.productType && <Badge variant="outline">{productTypeLabel(product.productType)}</Badge>}
        </div>
        <Link to={`/products/${product.id}`} className="group/title">
          <h2 className="line-clamp-2 min-h-12 text-[15px] font-bold leading-6 text-ink-800 group-hover/title:text-brand-700">
            {product.name}
          </h2>
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
          {product.brandName ?? product.manufacturer ?? product.category?.name ?? "PharmaFlow"}
        </p>
        {!compact && product.description && (
          <p className="mt-2 line-clamp-2 min-h-11 text-sm leading-6 text-slate-700">
            {product.description}
          </p>
        )}
        {compact && <div className="min-h-11" />}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <p className="text-2xl font-extrabold leading-none text-ink-800">{formatPrice(product.price)}</p>
          {product.packageSize && <p className="line-clamp-1 text-xs text-slate-500">{product.packageSize}</p>}
        </div>
        <div className="mt-3 min-h-10">
          <StockBadge summary={summary} />
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <Link
            to={`/products/${product.id}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-ink-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            View details
          </Link>
          <Button
            type="button"
            size="sm"
            aria-label={`Add ${product.name} to cart`}
            className="h-11 rounded-xl px-4 font-bold"
            onClick={() => cart.addItem(product)}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </article>
  );
}

function StockBadge({ summary }: { summary?: InventorySummaryDTO }) {
  if (!summary) return <p className="text-sm font-semibold text-slate-500">Checking availability...</p>;
  if (!summary.inStock) return <p className="text-sm font-bold text-red-600">Out of stock</p>;
  if (summary.lowStock) {
    return (
      <p className="text-sm font-bold text-amber-600">
        Low stock: {summary.totalQuantity} left at {summary.pharmacyCount} pharmacies
      </p>
    );
  }
  return (
    <p className="text-sm font-bold text-green-700">
      In stock at {summary.pharmacyCount} {summary.pharmacyCount === 1 ? "pharmacy" : "pharmacies"}
    </p>
  );
}
