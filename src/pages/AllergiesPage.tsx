import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/api/users";
import { getAllergies, updatePatientProfile } from "@/api/health";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/toast/useToast";
import type { AllergyDTO, PatientProfileDTO, Severity } from "@/types/api";
import { SEVERITY_LABELS } from "@/types/api";

const SEVERITIES: Severity[] = ["LOW", "MODERATE", "HIGH", "SEVERE", "LIFE_THREATENING"];

const severityVariant: Record<Severity, "info" | "warning" | "success" | "danger"> = {
  LOW: "success",
  MODERATE: "info",
  HIGH: "warning",
  SEVERE: "danger",
  LIFE_THREATENING: "danger",
};

const allergySchema = z.object({
  allergen: z
    .string()
    .min(2, "At least 2 characters")
    .max(100, "Max 100 characters")
    .regex(/^[A-Za-z0-9À-ÿ\s,.-]+$/, "Letters, numbers, spaces, commas, dots and hyphens only"),
  severity: z.string().optional(),
  activeSubstance: z
    .string()
    .max(100, "Max 100 characters")
    .regex(/^[A-Za-z0-9À-ÿ\s,.-]*$/, "Letters, numbers, spaces, commas, dots and hyphens only")
    .optional(),
});
type AllergyForm = z.infer<typeof allergySchema>;

export function AllergiesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState<AllergyDTO | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const toast = useToast();

  // ── Current user (patient profile) ───────────────────────────────────
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const profile  = user?.patientProfile;
  const allergies = profile?.allergies ?? [];

  // ── Global allergy catalogue — used for datalist autocomplete ─────────
  // Connects GET /api/allergies so the full system catalogue is accessible.
  const { data: cataloguePage } = useQuery({
    queryKey: ["allergyCatalogue"],
    queryFn: () => getAllergies({ page: 0, size: 100 }),
    staleTime: 5 * 60 * 1000, // cache 5 min; catalogue changes rarely
  });
  const catalogueItems = cataloguePage?.content ?? [];

  // ── Save helper (PUT the entire patient profile with updated allergies) ──
  const saveProfile = useMutation({
    mutationFn: (updatedAllergies: AllergyDTO[]) => {
      if (!profile?.id) throw new Error("No patient profile found.");
      const payload: PatientProfileDTO = { ...profile, allergies: updatedAllergies };
      return updatePatientProfile(profile.id, payload);
    },
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(["currentUser"], (prev: typeof user) =>
        prev ? { ...prev, patientProfile: savedProfile } : prev
      );
      setShowModal(false);
      setEditingAllergy(null);
      setDeleteConfirmId(null);
      toast.success("Allergy records updated.");
    },
  });

  // ── Form ──────────────────────────────────────────────────────────────
  const form = useForm<AllergyForm>({
    resolver: zodResolver(allergySchema),
  });

  function openAdd() {
    form.reset({ allergen: "", severity: "", activeSubstance: "" });
    setEditingAllergy(null);
    setShowModal(true);
  }

  function openEdit(a: AllergyDTO) {
    form.reset({
      allergen: a.allergen,
      severity: a.severity ?? "",
      activeSubstance: a.activeSubstance ?? "",
    });
    setEditingAllergy(a);
    setShowModal(true);
  }

  function handleSubmit(values: AllergyForm) {
    const newAllergy: AllergyDTO = {
      ...(editingAllergy?.id ? { id: editingAllergy.id } : {}),
      allergen: values.allergen,
      severity: (values.severity as Severity) || undefined,
      activeSubstance: values.activeSubstance || undefined,
    };

    let updated: AllergyDTO[];
    if (editingAllergy?.id) {
      updated = allergies.map((a) => (a.id === editingAllergy.id ? newAllergy : a));
    } else {
      updated = [...allergies, newAllergy];
    }

    saveProfile.mutate(updated);
  }

  function handleDelete(id: number) {
    const updated = allergies.filter((a) => a.id !== id);
    saveProfile.mutate(updated);
  }

  return (
    <div className="space-y-7 animate-section">
      <section className="flex flex-col gap-5 rounded-[2rem] bg-[radial-gradient(circle_at_90%_15%,rgba(34,197,94,0.18),transparent_24%),linear-gradient(135deg,#0f172a_0%,#172554_70%,#0f766e_100%)] p-7 text-white shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-brand-100 ring-1 ring-white/15">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-100">My Care</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Allergies</h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-200">Manage your allergy records.</p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-white text-brand-700 hover:bg-brand-50">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add allergy
        </Button>
      </section>

      {isLoading && (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      )}
      {isError && <ErrorMessage error={error} />}

      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <CardTitle>
              Allergy records
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {allergies.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allergies.length === 0 ? (
              <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50/70 py-12 text-center">
                <p className="text-sm text-slate-400">No allergies recorded yet.</p>
                <Button size="sm" className="mt-3" onClick={openAdd}>
                  Add your first allergy
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allergies.map((allergy, idx) => (
                  <div
                    key={allergy.id ?? idx}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{allergy.allergen}</p>
                      {allergy.activeSubstance && (
                        <p className="text-sm text-slate-500">
                          Active substance: {allergy.activeSubstance}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      {allergy.severity && (
                        <Badge variant={severityVariant[allergy.severity]}>
                          {SEVERITY_LABELS[allergy.severity]}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(allergy)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deleteConfirmId === allergy.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={saveProfile.isPending}
                            onClick={() => allergy.id && handleDelete(allergy.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => allergy.id && setDeleteConfirmId(allergy.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saveProfile.isError && (
              <div className="mt-4">
                <ErrorMessage error={saveProfile.error} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAllergy(null);
        }}
        title={editingAllergy ? "Edit allergy" : "Add allergy"}
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

          {/* Allergen — backed by the system catalogue via <datalist> */}
          <div className="space-y-1.5">
            <Label htmlFor="allergen">Allergen *</Label>
            <Input
              id="allergen"
              list="allergen-catalogue"
              placeholder="e.g. Penicillin, Aspirin, Pollen"
              {...form.register("allergen")}
              aria-invalid={!!form.formState.errors.allergen}
            />
            {/* Wires GET /api/allergies catalogue to browser-native autocomplete */}
            <datalist id="allergen-catalogue">
              {catalogueItems.map((item) => (
                <option key={item.id ?? item.allergen} value={item.allergen} />
              ))}
            </datalist>
            {form.formState.errors.allergen && (
              <p className="text-xs text-red-500">{form.formState.errors.allergen.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity</Label>
            <Select id="severity" {...form.register("severity")}>
              <option value="">Select severity…</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>

          {/* Active substance — also backed by catalogue suggestions */}
          <div className="space-y-1.5">
            <Label htmlFor="activeSubstance">Active substance</Label>
            <Input
              id="activeSubstance"
              list="substance-catalogue"
              placeholder="e.g. Amoxicillin"
              {...form.register("activeSubstance")}
              aria-invalid={!!form.formState.errors.activeSubstance}
            />
            <datalist id="substance-catalogue">
              {catalogueItems
                .filter((item) => item.activeSubstance)
                .map((item) => (
                  <option key={item.id ?? item.activeSubstance} value={item.activeSubstance!} />
                ))}
            </datalist>
            {form.formState.errors.activeSubstance && (
              <p className="text-xs text-red-500">
                {form.formState.errors.activeSubstance.message}
              </p>
            )}
          </div>

          {saveProfile.isError && <ErrorMessage error={saveProfile.error} />}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving…" : editingAllergy ? "Update" : "Add allergy"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingAllergy(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
