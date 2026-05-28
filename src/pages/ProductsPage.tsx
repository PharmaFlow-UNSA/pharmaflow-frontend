import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getProducts, type ProductQuery } from "@/api/products";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function ProductsPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ProductQuery>({});
  const [draft, setDraft] = useState<ProductQuery>({});

  const query = useQuery({
    queryKey: ["products", { page, ...filters }],
    queryFn: () => getProducts({ page, size: 9, sort: "price,asc", ...filters }),
    placeholderData: keepPreviousData,
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
    setPage(0);
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
      <p className="mb-6 text-slate-600">
        Catalog from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">product-health-service</code> served through the gateway.
      </p>

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
          <Label htmlFor="filterMin">Min price</Label>
          <Input
            id="filterMin"
            type="number"
            min="0"
            step="0.1"
            value={draft.minPrice ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filterMax">Max price</Label>
          <Input
            id="filterMax"
            type="number"
            min="0"
            step="0.1"
            value={draft.maxPrice ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
          />
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
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <CardDescription>
                    {p.brandName ?? p.manufacturer ?? "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {p.price.toFixed(2)} KM
                    </span>
                    {p.requiresPrescription ? (
                      <Badge variant="warning">Rx</Badge>
                    ) : (
                      <Badge variant="success">OTC</Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-sm text-slate-600">{p.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm font-medium">
                    <Link
                      to={`/products/${p.id}/availability`}
                      className="text-brand-700 hover:underline"
                    >
                      Availability →
                    </Link>
                    <Link
                      to={`/products/${p.id}/order`}
                      className="text-brand-700 hover:underline"
                    >
                      Order →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
