import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pill, Plus, Search, ShieldAlert, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createDrugInteraction,
  deleteDrugInteraction,
  getDrugInteractions,
  getSubstances,
} from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/toast/useToast";
import type { SeverityLevel } from "@/types/api";

const severityBadge: Record<SeverityLevel, "danger" | "warning" | "success"> = {
  MAJOR: "danger",
  MODERATE: "warning",
  MINOR: "success",
};

const schema = z
  .object({
    substanceAId: z.coerce.number().int().positive("Select substance A"),
    substanceBId: z.coerce.number().int().positive("Select substance B"),
    severity: z.enum(["MINOR", "MODERATE", "MAJOR"]),
    description: z.string().min(10, "At least 10 characters").max(2000, "Max 2000 characters"),
    clinicalRecommendation: z.string().max(2000).optional(),
  })
  .refine((values) => values.substanceAId !== values.substanceBId, {
    message: "Substance A and B must be different",
    path: ["substanceBId"],
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function DrugInteractionsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "">("");
  const [showModal, setShowModal] = useState(false);
  const { hasRole } = useAuth();
  const canWrite = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const canDelete = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: ["interactions"],
    queryFn: getDrugInteractions,
    staleTime: 60_000,
  });

  const substances = useQuery({
    queryKey: ["substances"],
    queryFn: getSubstances,
    enabled: showModal,
    staleTime: 300_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: createDrugInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      setShowModal(false);
      reset();
      toast.success("Drug interaction added.");
    },
    onError: () => {
      toast.error("Could not add the drug interaction.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDrugInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interactions"] });
      toast.success("Interaction deleted.");
    },
    onError: () => {
      toast.error("Could not delete the interaction.");
    },
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
        action={
          canWrite ? (
            <Button
              type="button"
              className="rounded-2xl bg-white text-brand-700 hover:bg-brand-50"
              onClick={() => setShowModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add interaction
            </Button>
          ) : undefined
        }
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
      {deleteMutation.isError && <ErrorMessage error={deleteMutation.error} />}

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
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={severityBadge[interaction.severity]} className="px-3 py-1 font-bold">
                      {interaction.severity}
                    </Badge>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this interaction?")) {
                            deleteMutation.mutate(interaction.id);
                          }
                        }}
                        className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete interaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
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

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          reset();
        }}
        title="Add drug interaction"
        className="max-w-lg"
      >
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          className="space-y-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="substanceAId">Substance A *</Label>
              <Select id="substanceAId" {...register("substanceAId")} aria-invalid={!!errors.substanceAId}>
                <option value="">Select...</option>
                {substances.data?.map((substance) => (
                  <option key={substance.id} value={substance.id}>
                    {substance.commonName ?? substance.inn}
                  </option>
                ))}
              </Select>
              {errors.substanceAId && <p className="text-xs text-red-600">{errors.substanceAId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="substanceBId">Substance B *</Label>
              <Select id="substanceBId" {...register("substanceBId")} aria-invalid={!!errors.substanceBId}>
                <option value="">Select...</option>
                {substances.data?.map((substance) => (
                  <option key={substance.id} value={substance.id}>
                    {substance.commonName ?? substance.inn}
                  </option>
                ))}
              </Select>
              {errors.substanceBId && <p className="text-xs text-red-600">{errors.substanceBId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity *</Label>
            <Select id="severity" {...register("severity")} aria-invalid={!!errors.severity}>
              <option value="">Select...</option>
              <option value="MINOR">Minor</option>
              <option value="MODERATE">Moderate</option>
              <option value="MAJOR">Major</option>
            </Select>
            {errors.severity && <p className="text-xs text-red-600">{errors.severity.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              placeholder="Describe the clinical significance of this interaction."
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinicalRecommendation">Clinical recommendation</Label>
            <textarea
              id="clinicalRecommendation"
              rows={2}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              placeholder="Example: avoid combination or monitor closely."
              {...register("clinicalRecommendation")}
            />
          </div>

          {createMutation.isError && <ErrorMessage error={createMutation.error} />}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Add interaction"}
            </Button>
          </div>
        </form>
      </Modal>
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
