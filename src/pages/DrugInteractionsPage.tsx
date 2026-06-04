import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createDrugInteraction,
  deleteDrugInteraction,
  getDrugInteractions,
  getSubstances,
} from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { SeverityLevel } from "@/types/api";

const severityBadge: Record<SeverityLevel, "danger" | "warning" | "success"> = {
  MAJOR: "danger",
  MODERATE: "warning",
  MINOR: "success",
};

const schema = z.object({
  substanceAId: z.coerce.number().int().positive("Select substance A"),
  substanceBId: z.coerce.number().int().positive("Select substance B"),
  severity: z.enum(["MINOR", "MODERATE", "MAJOR"], { required_error: "Select severity" }),
  description: z.string().min(10, "At least 10 characters").max(2000, "Max 2000 characters"),
  clinicalRecommendation: z.string().max(2000).optional(),
}).refine((d) => d.substanceAId !== d.substanceBId, {
  message: "Substance A and B must be different",
  path: ["substanceBId"],
});

type FormValues = z.infer<typeof schema>;

export function DrugInteractionsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const { hasRole } = useAuth();
  const canWrite = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const canDelete = hasRole("ROLE_ADMIN");
  const qc = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: createDrugInteraction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["interactions"] });
      setShowModal(false);
      reset();
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 4000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDrugInteraction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["interactions"] });
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 4000);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
      <div className="mb-6 flex items-center justify-between">
        <div>
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
        {canWrite && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add interaction
          </Button>
        )}
      </div>

      {addSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Drug interaction added successfully.
        </div>
      )}
      {deleteSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Interaction deleted.
        </div>
      )}
      {deleteMutation.isError && <ErrorMessage error={deleteMutation.error} className="mb-4" />}

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
      {query.isLoading && <p className="text-slate-500">Loading interactions…</p>}

      {filtered && filtered.length === 0 && !query.isLoading && (
        <p className="text-slate-500">No interactions found.</p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((i) => (
            <div key={i.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-800">
                    {i.substanceAName ?? "—"}
                  </span>
                  <span className="text-slate-400">+</span>
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-800">
                    {i.substanceBName ?? "—"}
                  </span>
                  <Badge variant={severityBadge[i.severity]}>{i.severity}</Badge>
                </div>
                {canDelete && (
                  <button
                    onClick={() => { if (window.confirm("Delete this interaction?")) deleteMutation.mutate(i.id); }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete interaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {i.description && <p className="text-sm text-slate-700">{i.description}</p>}
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

      {/* ── Add Interaction Modal ─────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset(); }}
        title="Add drug interaction"
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="substanceAId">Substance A *</Label>
              <Select id="substanceAId" {...register("substanceAId")} aria-invalid={!!errors.substanceAId}>
                <option value="">Select…</option>
                {substances.data?.map((s) => (
                  <option key={s.id} value={s.id}>{s.commonName ?? s.inn}</option>
                ))}
              </Select>
              {errors.substanceAId && <p className="text-xs text-red-600">{errors.substanceAId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="substanceBId">Substance B *</Label>
              <Select id="substanceBId" {...register("substanceBId")} aria-invalid={!!errors.substanceBId}>
                <option value="">Select…</option>
                {substances.data?.map((s) => (
                  <option key={s.id} value={s.id}>{s.commonName ?? s.inn}</option>
                ))}
              </Select>
              {errors.substanceBId && <p className="text-xs text-red-600">{errors.substanceBId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity *</Label>
            <Select id="severity" {...register("severity")} aria-invalid={!!errors.severity}>
              <option value="">Select…</option>
              <option value="MINOR">Minor</option>
              <option value="MODERATE">Moderate</option>
              <option value="MAJOR">Major</option>
            </Select>
            {errors.severity && <p className="text-xs text-red-600">{errors.severity.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <textarea id="description" rows={3}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              placeholder="Describe the clinical significance of this interaction…"
              {...register("description")} aria-invalid={!!errors.description} />
            {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinicalRecommendation">Clinical recommendation</Label>
            <textarea id="clinicalRecommendation" rows={2}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              placeholder="e.g. Avoid combination. Monitor INR if used together."
              {...register("clinicalRecommendation")} />
          </div>

          {createMutation.isError && <ErrorMessage error={createMutation.error} />}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Add interaction"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
