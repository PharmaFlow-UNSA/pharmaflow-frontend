import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { getDrugInteractions } from "@/api/products";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { SeverityLevel } from "@/types/api";

const severityBadge: Record<SeverityLevel, "danger" | "warning" | "success"> = {
  MAJOR: "danger",
  MODERATE: "warning",
  MINOR: "success",
};

export function DrugInteractionsPage() {
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["interactions"],
    queryFn: getDrugInteractions,
    staleTime: 60_000,
  });

  const filtered = query.data?.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.substanceAName?.toLowerCase().includes(q) ||
      i.substanceBName?.toLowerCase().includes(q)
    );
  });
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Drug Interactions
        </h1>
        <p className="mt-1 text-slate-600">
          Clinical interaction database from{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
            product-health-service
          </code>
          . Visible to doctors, pharmacists, and admins.
        </p>
      </div>

      <div className="mb-6 max-w-sm space-y-1.5">
        <Label htmlFor="search">Search by substance name</Label>
        <Input
          id="search"
          placeholder="e.g. Ibuprofen"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && (
        <p className="text-slate-500">Loading interactions…</p>
      )}

      {filtered && filtered.length === 0 && !query.isLoading && (
        <p className="text-slate-500">No interactions found.</p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((i) => (
            <div
              key={i.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-800">
                  {i.substanceAName ?? "—"}
                </span>
                <span className="text-slate-400">+</span>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-800">
                  {i.substanceBName ?? "—"}
                </span>
                <Badge variant={severityBadge[i.severity]}>{i.severity}</Badge>
              </div>

              {i.description && (
                <p className="text-sm text-slate-700">{i.description}</p>
              )}

              {i.clinicalRecommendation && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Recommendation: </span>
                    {i.clinicalRecommendation}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {query.data && (
        <p className="mt-4 text-sm text-slate-500">
          {query.data.length} interactions in database
          {search && ` · ${filtered?.length ?? 0} matching "${search}"`}
        </p>
      )}
    </div>
  );
}
