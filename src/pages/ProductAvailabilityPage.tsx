import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getInventoryForProduct, getPharmacies } from "@/api/pharmacies";
import { getProductById } from "@/api/products";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function ProductAvailabilityPage() {
  const { productId } = useParams();
  const id = Number(productId);

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: Number.isFinite(id),
  });

  const inventory = useQuery({
    queryKey: ["inventory", "product", id],
    queryFn: () => getInventoryForProduct(id),
    enabled: Number.isFinite(id),
  });

  const pharmacies = useQuery({
    queryKey: ["pharmacies", { size: 50 }],
    queryFn: () => getPharmacies({ size: 50 }),
  });

  const pharmaciesById = new Map(pharmacies.data?.content.map((p) => [p.id, p]) ?? []);

  return (
    <div>
      {product.isError && <ErrorMessage error={product.error} />}
      {product.isLoading && <p className="text-slate-500">Loading product…</p>}

      {product.data && (
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">{product.data.name}</h1>
          <p className="text-slate-600">
            {product.data.brandName ?? product.data.manufacturer ?? "—"} · {product.data.price.toFixed(2)} KM
          </p>
          {product.data.description && (
            <p className="mt-2 text-sm text-slate-700">{product.data.description}</p>
          )}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Availability per pharmacy</h2>

      {inventory.isError && <ErrorMessage error={inventory.error} />}
      {inventory.isLoading && <p className="text-slate-500">Checking stock…</p>}

      {inventory.data && inventory.data.length === 0 && (
        <p className="text-slate-600">No pharmacies currently stock this product.</p>
      )}

      {inventory.data && inventory.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {inventory.data.map((inv) => {
            const ph = pharmaciesById.get(inv.pharmacyId);
            const lowStock = inv.reorderLevel != null && inv.quantity <= inv.reorderLevel;
            return (
              <Card key={inv.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {ph?.name ?? `Pharmacy #${inv.pharmacyId}`}
                  </CardTitle>
                  {ph && (
                    <p className="text-sm text-slate-500">
                      {ph.address}, {ph.city}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-slate-900">
                      {inv.quantity}
                      <span className="ml-1 text-sm font-normal text-slate-500">in stock</span>
                    </span>
                    {lowStock ? (
                      <Badge variant="warning">Low stock</Badge>
                    ) : inv.quantity > 0 ? (
                      <Badge variant="success">Available</Badge>
                    ) : (
                      <Badge variant="danger">Out of stock</Badge>
                    )}
                  </div>
                  {ph?.openingHours && (
                    <p className="mt-2 text-xs text-slate-500">Hours: {ph.openingHours}</p>
                  )}
                  {inv.quantity > 0 && (
                    <Link
                      to={`/products/${id}/reserve?pharmacyId=${inv.pharmacyId}`}
                      className="mt-3 inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                    >
                      Reserve here
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
