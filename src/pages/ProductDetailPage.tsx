import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Minus, Pill, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProductInventorySummary } from "@/api/pharmacies";
import {
  deleteProduct,
  deactivateProduct,
  getProductById,
  getSubstitutesForProduct,
} from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { useCart } from "@/cart/useCart";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, getProductImage, productTypeLabel } from "@/lib/catalog";
import { useToast } from "@/toast/useToast";

export function ProductDetailPage() {
  const { productId } = useParams();
  const id = Number(productId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);

  const canWrite = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const canDelete = hasRole("ROLE_ADMIN");
  const canSeeInteractions = hasRole("ROLE_DOCTOR", "ROLE_PHARMACIST", "ROLE_ADMIN");

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: Number.isFinite(id),
  });

  const substitutes = useQuery({
    queryKey: ["substitutes", id],
    queryFn: () => getSubstitutesForProduct(id),
    enabled: Number.isFinite(id),
  });

  const stockSummary = useQuery({
    queryKey: ["inventory", "product-summary", id],
    queryFn: () => getProductInventorySummary([id]),
    enabled: Number.isFinite(id),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["product", id] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deactivated.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted.");
      navigate("/products");
    },
  });

  return (
    <div>
      {product.isError && <ErrorMessage error={product.error} />}
      {product.isLoading && <p className="text-slate-500">Loading product…</p>}

      {product.data && (
        <div className="space-y-8">
          <div className="grid gap-10 bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="relative flex min-h-[34rem] items-center justify-center bg-white">
              <img
                src={getProductImage(product.data)}
                alt={product.data.name}
                className="max-h-[32rem] max-w-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <p className="text-sm font-bold text-ink-800 underline">
                  {product.data.brandName ?? product.data.manufacturer ?? "PharmaFlow"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{productTypeLabel(product.data.productType)}</Badge>
                  {product.data.requiresPrescription ? (
                    <Badge variant="warning">Prescription required</Badge>
                  ) : (
                    <Badge variant="success">OTC</Badge>
                  )}
                  {product.data.category && <Badge variant="outline">{product.data.category.name}</Badge>}
                  {product.data.isActive === false && <Badge variant="danger">Inactive</Badge>}
                </div>
                <div>
                  <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-ink-800">
                    {product.data.name}
                  </h1>
                  {product.data.description && (
                    <p className="mt-3 max-w-xl text-base leading-7 text-slate-700">
                      {product.data.description}
                    </p>
                  )}
                </div>
                <p className="text-4xl font-extrabold text-red-600">{formatPrice(product.data.price)}</p>
                {product.data.packageSize && (
                  <p className="text-sm text-slate-500">{product.data.packageSize}</p>
                )}
                <StockSummary summary={stockSummary.data?.[0]} />
              </div>
              <div className="space-y-5">
                <div className="flex max-w-xl flex-wrap gap-3">
                  <div className="flex h-12 overflow-hidden rounded-sm border border-slate-300 bg-white">
                    <button
                      type="button"
                      className="flex w-11 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex w-14 items-center justify-center border-x border-slate-300 text-sm font-semibold">
                      {quantity}
                    </div>
                    <button
                      type="button"
                      className="flex w-11 items-center justify-center text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      disabled={quantity >= 99}
                      aria-label="Increase quantity"
                      onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    type="button"
                    className="h-12 min-w-64 flex-1 text-base font-extrabold"
                    onClick={() => {
                      cart.addItem(product.data, quantity);
                      toast.success(`${quantity} added to cart.`);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to shopping cart
                  </Button>
                </div>
                <div className="space-y-3 text-sm font-medium text-slate-800">
                  <p className="flex items-center gap-3">
                    <span className="text-2xl font-black text-ink-800">✓</span>
                    Free pickup from partner pharmacies
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-2xl font-black text-ink-800">✓</span>
                    Secure ordering and prescription-aware checkout
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-2xl font-black text-ink-800">✓</span>
                    Pharmacist support for questions
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/products/${id}/availability`}
                    className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-ink-800 hover:bg-slate-50"
                  >
                    Check availability
                  </Link>
                  <Link
                    to={`/products/${id}/order`}
                    className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-ink-800 hover:bg-slate-50"
                  >
                    Order now
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.data.description && (
            <div className="rounded-md border border-slate-200 bg-white p-6">
              <h2 className="mb-2 font-semibold text-slate-900">Description</h2>
              <p className="text-sm text-slate-700">{product.data.description}</p>
            </div>
          )}

          {/* Active Substances */}
          {product.data.substances && product.data.substances.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white p-6">
              <h2 className="mb-3 font-semibold text-slate-900">Active Substances</h2>
              <div className="space-y-2">
                {product.data.substances.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"
                  >
                    <Pill className="h-4 w-4 shrink-0 text-brand-600" />
                    <div>
                      <p className="font-medium text-slate-900">{s.commonName ?? s.inn}</p>
                      {s.commonName && (
                        <p className="text-xs text-slate-500">INN: {s.inn}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drug interactions notice */}
          {canSeeInteractions && (
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Clinical reference</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Review drug interactions and contraindications before dispensing.{" "}
                  <Link to="/interactions" className="font-medium underline">
                    Open interactions table →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Substitutes */}
          {substitutes.data && substitutes.data.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white p-6">
              <h2 className="mb-3 font-semibold text-slate-900">
                Available Substitutes ({substitutes.data.length})
              </h2>
              <div className="space-y-2">
                {substitutes.data.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {s.substituteProduct?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.substituteType}
                        {s.isTherapeuticEquivalent && " · Therapeutic equivalent"}
                      </p>
                      {s.note && <p className="mt-1 text-xs text-slate-500">{s.note}</p>}
                    </div>
                    {s.substituteProduct && (
                      <Link
                        to={`/products/${s.substituteProduct.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin actions */}
          {(canWrite || canDelete) && (
            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
              {canWrite && (
                <Link
                  to={`/products/${id}/edit`}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Edit product
                </Link>
              )}
              {canWrite && product.data.isActive !== false && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm("Deactivate this product?"))
                      deactivateMutation.mutate();
                  }}
                  disabled={deactivateMutation.isPending}
                >
                  Deactivate
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("Permanently delete this product?"))
                      deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              )}
              {(deactivateMutation.isError || deleteMutation.isError) && (
                <ErrorMessage
                  error={deactivateMutation.error ?? deleteMutation.error}
                  className="w-full"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StockSummary({
  summary,
}: {
  summary?: {
    totalQuantity: number;
    pharmacyCount: number;
    inStock: boolean;
    lowStock?: boolean;
  };
}) {
  if (!summary) return <p className="text-base font-bold text-slate-500">Checking stock...</p>;
  if (!summary.inStock) return <p className="text-base font-bold text-red-600">Out of stock</p>;
  if (summary.lowStock) {
    return (
      <p className="text-base font-bold text-amber-600">
        Low stock · {summary.totalQuantity} units at {summary.pharmacyCount} pharmacies
      </p>
    );
  }
  return (
    <p className="text-base font-bold text-green-700">
      In stock: delivery within 1 to 2 business days
    </p>
  );
}
