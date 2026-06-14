import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Pill, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { getDrugInteractions } from "@/api/products";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { SeverityLevel } from "@/types/api";

const severityBadge: Record<SeverityLevel, "danger" | "warning" | "success"> = {
  MAJOR: "danger",
  MODERATE: "warning",
  MINOR: "success",
};

export function DrugInteractionsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "">("");

  const query = useQuery({
    queryKey: ["interactions"],
    queryFn: getDrugInteractions,
    staleTime: 60_000,
  });

  const interactions = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(
    () =>
      interactions.filter((interaction) => {
        const matchesSeverity = !severityFilter || interaction.severity === severityFilter;
        if (!matchesSeverity) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          interaction.substanceAName?.toLowerCase().includes(q) ||
          interaction.substanceBName?.toLowerCase().includes(q) ||
          interaction.description?.toLowerCase().includes(q)
        );
      }),
    [interactions, search, severityFilter]
  );

  const stats = {
    total: interactions.length,
    major: interactions.filter((item) => item.severity === "MAJOR").length,
    moderate: interactions.filter((item) => item.severity === "MODERATE").length,
  };

  return (
    <div className="space-y-7 animate-section">
      <AdminPageHeader
        eyebrow="Clinical workspace"
        title="Interaction review"
        description="Review medication interaction records available to doctors, pharmacists, and admins."
        icon={ShieldAlert}
        stats={[
          { label: "Records", value: stats.total },
          { label: "Major", value: stats.major },
          { label: "Moderate", value: stats.moderate },
        ]}
      />

      <Card className="rounded-[1.75rem] shadow-sm">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_16rem] md:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="interaction-search">Search interactions</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="interaction-search"
                placeholder="Search by substance or description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-11"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interaction-severity">Severity</Label>
            <Select
              id="interaction-severity"
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as SeverityLevel | "")}
            >
              <option value="">All severities</option>
              <option value="MAJOR">Major</option>
              <option value="MODERATE">Moderate</option>
              <option value="MINOR">Minor</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {query.isError && <ErrorMessage error={query.error} />}

      {query.isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[1.75rem] bg-slate-200/70" />
          ))}
        </div>
      )}

      {!query.isLoading && !query.isError && filtered.length === 0 && (
        <EmptyState
          title="No interactions found"
          description="Adjust the search or severity filter to review another set of interaction records."
          icon={ShieldAlert}
        />
      )}

      {filtered.length > 0 && (
        <div className="grid gap-4">
          {filtered.map((interaction) => (
            <Card key={interaction.id} className="group rounded-[1.75rem] hover-lift">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Pill className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SubstancePill>{interaction.substanceAName ?? "Unknown substance"}</SubstancePill>
                        <span className="text-sm font-bold text-slate-400">+</span>
                        <SubstancePill>{interaction.substanceBName ?? "Unknown substance"}</SubstancePill>
                      </div>
                      {interaction.description && (
                        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">
                          {interaction.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={severityBadge[interaction.severity]} className="shrink-0 px-3 py-1 font-bold">
                    {interaction.severity}
                  </Badge>
                </div>

                {interaction.clinicalRecommendation && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm leading-6">
                      <span className="font-bold">Recommendation: </span>
                      {interaction.clinicalRecommendation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {query.data && (
        <p className="text-sm text-slate-500">
          Showing {filtered.length} of {query.data.length} interaction records.
        </p>
      )}
    </div>
  );
}

function SubstancePill({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-ink-800 ring-1 ring-slate-200">
      {children}
    </span>
  );
}
