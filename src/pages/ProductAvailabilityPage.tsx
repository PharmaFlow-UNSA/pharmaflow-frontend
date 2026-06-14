import { useQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { Building2, Clock, MapPin, PackageCheck, Phone, ShoppingBag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getInventoryForProduct, getPharmacies } from "@/api/pharmacies";
import { getProductById } from "@/api/products";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatPrice, getProductImage, productTypeLabel } from "@/lib/catalog";

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

  const pharmaciesById = new Map(pharmacies.data?.content.map((pharmacy) => [pharmacy.id, pharmacy]) ?? []);
  const stockItems = (inventory.data ?? []).slice().sort((a, b) => b.quantity - a.quantity);
  const totalStock = stockItems.reduce((sum, item) => sum + item.quantity, 0);
  const stockedPharmacyCount = stockItems.filter((item) => item.quantity > 0).length;

  return (
    <div className="space-y-8 animate-section">
      {(product.isError || inventory.isError || pharmacies.isError) && (
        <ErrorMessage error={product.error ?? inventory.error ?? pharmacies.error} />
      )}

      {product.isLoading && <AvailabilitySkeleton />}

      {product.data && (
        <>
          <section className="overflow-hidden rounded-[2rem] border border-brand-100 bg-[radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] shadow-sm">
            <div className="grid gap-8 p-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-8">
              <div className="flex min-h-56 items-center justify-center rounded-[1.5rem] bg-white/80 p-5 ring-1 ring-slate-200">
                <img
                  src={getProductImage(product.data)}
                  alt={product.data.name}
                  className="max-h-52 max-w-full object-contain"
                />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={product.data.requiresPrescription ? "warning" : "success"}>
                    {product.data.requiresPrescription ? "Prescription required" : "OTC"}
                  </Badge>
                  {product.data.productType && <Badge variant="outline">{productTypeLabel(product.data.productType)}</Badge>}
                  {product.data.category && <Badge variant="info">{product.data.category.name}</Badge>}
                </div>
                <p className="mt-5 text-sm font-bold uppercase tracking-wider text-brand-700">
                  Pharmacy availability
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-800 sm:text-4xl">
                  {product.data.name}
                </h1>
                <p className="mt-2 text-lg text-slate-600">
                  {product.data.brandName ?? product.data.manufacturer ?? "PharmaFlow"} · {formatPrice(product.data.price)}
                </p>
                {product.data.description && (
                  <p className="mt-4 max-w-3xl leading-7 text-slate-700">{product.data.description}</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <AvailabilityStat label="Total units" value={inventory.isLoading ? "..." : totalStock} />
            <AvailabilityStat label="Pharmacies with stock" value={inventory.isLoading ? "..." : stockedPharmacyCount} />
            <AvailabilityStat label="Package size" value={product.data.packageSize ?? "Not listed"} />
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pickup options</p>
                <h2 className="mt-1 text-2xl font-extrabold text-ink-800">Availability per pharmacy</h2>
              </div>
              <Link
                to={`/products/${id}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-ink-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                View product details
              </Link>
            </div>

            {inventory.isLoading && (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-64 rounded-[1.75rem] skeleton-shimmer" />
                ))}
              </div>
            )}

            {inventory.data && inventory.data.length === 0 && (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-extrabold text-ink-800">No pharmacy stock found</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This product is not currently listed in nearby pharmacy inventory.
                </p>
              </div>
            )}

            {stockItems.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                {stockItems.map((item) => {
                  const pharmacy = pharmaciesById.get(item.pharmacyId);
                  const lowStock = item.reorderLevel != null && item.quantity > 0 && item.quantity <= item.reorderLevel;
                  return (
                    <Card key={item.id} className="overflow-hidden hover:border-brand-200 hover:shadow-md">
                      <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                              <Building2 className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-lg font-extrabold text-ink-800">
                                {pharmacy?.name ?? `Pharmacy #${item.pharmacyId}`}
                              </CardTitle>
                              <CardDescription className="mt-1 flex items-start gap-1.5">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                                {pharmacy ? `${pharmacy.address}, ${pharmacy.city}` : "Address unavailable"}
                              </CardDescription>
                            </div>
                          </div>
                          <StockStatus quantity={item.quantity} lowStock={lowStock} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 pt-5">
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available stock</p>
                            <p className="mt-1 text-4xl font-extrabold text-ink-800">
                              {item.quantity}
                              <span className="ml-2 text-base font-semibold text-slate-500">units</span>
                            </p>
                          </div>
                          {item.reorderLevel != null && (
                            <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                              Reorder at {item.reorderLevel}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          {pharmacy?.openingHours && (
                            <InfoPill icon={Clock} label="Hours" value={pharmacy.openingHours} />
                          )}
                          {pharmacy?.phoneNumber && (
                            <InfoPill icon={Phone} label="Phone" value={pharmacy.phoneNumber} />
                          )}
                        </div>

                        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                          {item.quantity > 0 ? (
                            <Link to={`/products/${id}/reserve?pharmacyId=${item.pharmacyId}`} className="sm:w-auto">
                              <Button type="button" className="w-full sm:w-auto">
                                <ShoppingBag className="mr-1.5 h-4 w-4" />
                                Reserve here
                              </Button>
                            </Link>
                          ) : (
                            <Button type="button" disabled>
                              Out of stock
                            </Button>
                          )}
                          {pharmacy && (
                            <Link
                              to={`/pharmacies/${pharmacy.id}`}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-ink-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                            >
                              View pharmacy
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AvailabilityStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink-800">{value}</p>
    </div>
  );
}

function StockStatus({ quantity, lowStock }: { quantity: number; lowStock: boolean }) {
  if (quantity <= 0) return <Badge variant="danger">Out of stock</Badge>;
  if (lowStock) return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">Available</Badge>;
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 truncate font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-80 rounded-[2rem] skeleton-shimmer" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[1.25rem] skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
