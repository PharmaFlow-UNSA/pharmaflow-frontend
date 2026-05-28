import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getPharmacies, type PharmacyQuery } from "@/api/pharmacies";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function PharmaciesPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<PharmacyQuery>({});
  const [draft, setDraft] = useState<PharmacyQuery>({});

  const query = useQuery({
    queryKey: ["pharmacies", { page, ...filters }],
    queryFn: () => getPharmacies({ page, size: 9, sort: "name,asc", ...filters }),
    placeholderData: keepPreviousData,
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
    setPage(0);
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Pharmacies</h1>
      <p className="mb-6 text-slate-600">
        Catalogue from{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
          pharmacy-inventory-service
        </code>
        . Click any pharmacy to see its inventory.
      </p>

      <form
        onSubmit={applyFilters}
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-4"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="filterName">Name contains</Label>
          <Input
            id="filterName"
            placeholder="e.g. Centar"
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filterCity">City</Label>
          <Input
            id="filterCity"
            placeholder="e.g. Sarajevo"
            value={draft.city ?? ""}
            onChange={(e) => setDraft({ ...draft, city: e.target.value || undefined })}
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
      {query.isLoading && <p className="text-slate-500">Loading pharmacies…</p>}

      {query.data && query.data.content.length === 0 && (
        <p className="text-slate-600">No pharmacies match these filters.</p>
      )}

      {query.data && query.data.content.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.content.map((p) => (
              <Link key={p.id} to={`/pharmacies/${p.id}`} className="group block">
                <Card className="h-full transition-colors group-hover:border-brand-200">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base group-hover:text-brand-700">
                        {p.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {p.address}, {p.city}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {p.phoneNumber}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {p.email}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Hours: {p.openingHours}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {query.data.number + 1} of {Math.max(1, query.data.totalPages)} ·{" "}
              {query.data.totalElements} pharmac{query.data.totalElements === 1 ? "y" : "ies"}
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
