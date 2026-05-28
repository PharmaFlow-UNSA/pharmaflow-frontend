import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, type ProductQuery } from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

export function ProductsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ProductQuery>({});
  const [draft, setDraft] = useState<ProductQuery>({});

  const query = useQuery({
    queryKey: ["products", { page, ...filters }],
    queryFn: () => getProducts({ page, size: 9, sort: "name,asc", ...filters }),
    placeholderData: keepPreviousData,
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
    setPage(0);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="mt-1 text-slate-600">
            Catalog from{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              product-health-service
            </code>{" "}
            served through the gateway.
          </p>
        </div>
        {canWrite && (
          <Link
            to="/products/new"
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Add product
          </Link>
        )}
      </div>

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="filterName">Name contains</Label>
          <Input
            id="filterName"
            placeholder="e.g. Brufen"
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filterType">Type</Label>
          <Select
            id="filterType"
            value={draft.productType ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, productType: e.target.value || undefined })
            }
          >
            <option value="">All types</option>
            <option value="MEDICATION">Medication</option>
            <option value="SUPPLEMENT">Supplement</option>
            <option value="COSMETIC">Cosmetic</option>
            <option value="MEDICAL_DEVICE">Medical device</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filterRx">Prescription</Label>
          <Select
            id="filterRx"
            value={draft.requiresPrescription === undefined ? "" : String(draft.requiresPrescription)}
            onChange={(e) =>
              setDraft({
                ...draft,
                requiresPrescription:
                  e.target.value === "" ? undefined : e.target.value === "true",
              })
            }
          >
            <option value="">All</option>
            <option value="false">OTC only</option>
            <option value="true">Rx only</option>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft({});
              setFilters({});
              setPage(0);
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && <p className="text-slate-500">Loading…</p>}

      {query.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.content.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.requiresPrescription ? (
                      <Badge variant="warning">Rx</Badge>
                    ) : (
                      <Badge variant="success">OTC</Badge>
                    )}
                  </div>
                  <CardDescription>{p.brandName ?? p.manufacturer ?? "—"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {p.price.toFixed(2)} KM
                    </span>
                    {p.productType && (
                      <Badge variant="default">{p.productType}</Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-slate-600">{p.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <Link
                      to={`/products/${p.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      View details →
                    </Link>
                    <Link
                      to={`/products/${p.id}/availability`}
                      className="text-slate-500 hover:underline"
                    >
                      Check stock
                    </Link>
                    <Link
                      to={`/products/${p.id}/order`}
                      className="text-slate-500 hover:underline"
                    >
                      Order
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {query.data.content.length === 0 && (
            <p className="py-8 text-center text-slate-500">No products match your filters.</p>
          )}

          <div className="mt-8 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {query.data.number + 1} of {Math.max(1, query.data.totalPages)} ·{" "}
              {query.data.totalElements} products total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
