import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pill } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteProduct,
  deactivateProduct,
  getProductById,
  getSubstitutesForProduct,
} from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function ProductDetailPage() {
  const { productId } = useParams();
  const id = Number(productId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasRole } = useAuth();

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

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["product", id] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      navigate("/products");
    },
  });

  return (
    <div>
      {product.isError && <ErrorMessage error={product.error} />}
      {product.isLoading && <p className="text-slate-500">Loading product…</p>}

      {product.data && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">{product.data.productType ?? "MEDICATION"}</Badge>
                {product.data.requiresPrescription ? (
                  <Badge variant="warning">Prescription required</Badge>
                ) : (
                  <Badge variant="success">OTC</Badge>
                )}
                {product.data.isActive === false && (
                  <Badge variant="danger">Inactive</Badge>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">{product.data.name}</h1>
              {product.data.brandName && (
                <p className="text-slate-600">{product.data.brandName}</p>
              )}
              <p className="text-sm text-slate-500">{product.data.manufacturer}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">
                {product.data.price.toFixed(2)} KM
              </p>
              {product.data.packageSize && (
                <p className="text-sm text-slate-500">{product.data.packageSize}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {product.data.description && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-2 font-semibold text-slate-900">Description</h2>
              <p className="text-sm text-slate-700">{product.data.description}</p>
            </div>
          )}

          {/* Active Substances */}
          {product.data.substances && product.data.substances.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
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
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
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
            <div className="rounded-xl border border-slate-200 bg-white p-6">
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

          {/* Availability */}
          <div className="flex gap-3">
            <Link
              to={`/products/${id}/availability`}
              className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Check availability at pharmacies
            </Link>
          </div>

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
