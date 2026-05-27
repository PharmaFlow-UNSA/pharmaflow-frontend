import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Pencil, Pill, Plus, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/api/users";
import { getTherapies, updatePatientProfile } from "@/api/health";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import type { PatientProfileDTO, TherapyDTO } from "@/types/api";

const therapySchema = z.object({
  medicationName: z
    .string()
    .min(2, "At least 2 characters")
    .max(100, "Max 100 characters")
    .regex(/^[A-Za-z0-9À-ÿ\s,.-]+$/, "Letters, numbers, spaces, commas, dots and hyphens only"),
  dosage: z
    .string()
    .max(50, "Max 50 characters")
    .optional()
    .or(z.literal("")),
  frequency: z
    .string()
    .max(50, "Max 50 characters")
    .optional()
    .or(z.literal("")),
});
type TherapyForm = z.infer<typeof therapySchema>;

export function TherapiesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTherapy, setEditingTherapy] = useState<TherapyDTO | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ── Current user (patient profile) ───────────────────────────────────
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const profile  = user?.patientProfile;
  const therapies = profile?.therapies ?? [];

  // ── Global therapy catalogue — used for datalist autocomplete ─────────
  // Connects GET /api/therapies so the full system catalogue is accessible.
  const { data: cataloguePage } = useQuery({
    queryKey: ["therapyCatalogue"],
    queryFn: () => getTherapies({ page: 0, size: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const catalogueItems = cataloguePage?.content ?? [];

  // ── Save helper ───────────────────────────────────────────────────────
  const saveProfile = useMutation({
    mutationFn: (updatedTherapies: TherapyDTO[]) => {
      if (!profile?.id) throw new Error("No patient profile found.");
      const payload: PatientProfileDTO = { ...profile, therapies: updatedTherapies };
      return updatePatientProfile(profile.id, payload);
    },
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(["currentUser"], (prev: typeof user) =>
        prev ? { ...prev, patientProfile: savedProfile } : prev
      );
      setShowModal(false);
      setEditingTherapy(null);
      setDeleteConfirmId(null);
    },
  });

  // ── Form ──────────────────────────────────────────────────────────────
  const form = useForm<TherapyForm>({
    resolver: zodResolver(therapySchema),
  });

  function openAdd() {
    form.reset({ medicationName: "", dosage: "", frequency: "" });
    setEditingTherapy(null);
    setShowModal(true);
  }

  function openEdit(t: TherapyDTO) {
    form.reset({
      medicationName: t.medicationName,
      dosage: t.dosage ?? "",
      frequency: t.frequency ?? "",
    });
    setEditingTherapy(t);
    setShowModal(true);
  }

  function handleSubmit(values: TherapyForm) {
    const newTherapy: TherapyDTO = {
      ...(editingTherapy?.id ? { id: editingTherapy.id } : {}),
      medicationName: values.medicationName,
      dosage: values.dosage || undefined,
      frequency: values.frequency || undefined,
    };

    let updated: TherapyDTO[];
    if (editingTherapy?.id) {
      updated = therapies.map((t) => (t.id === editingTherapy.id ? newTherapy : t));
    } else {
      updated = [...therapies, newTherapy];
    }

    saveProfile.mutate(updated);
  }

  function handleDelete(id: number) {
    const updated = therapies.filter((t) => t.id !== id);
    saveProfile.mutate(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/health">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Health
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Therapies</h1>
          <p className="text-sm text-slate-500">Manage your active medications and treatments.</p>
        </div>
      </div>

      {isLoading && <div className="h-48 animate-pulse rounded-xl bg-slate-100" />}
      {isError && <ErrorMessage error={error} />}

      {!isLoading && !isError && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Active therapies
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {therapies.length}
                </span>
              </CardTitle>
              <Button size="sm" onClick={openAdd}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add therapy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {therapies.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm text-slate-400">No therapies recorded yet.</p>
                <Button size="sm" className="mt-3" onClick={openAdd}>
                  Add your first therapy
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {therapies.map((therapy, idx) => (
                  <div
                    key={therapy.id ?? idx}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Pill className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                        <p className="font-medium text-slate-900">{therapy.medicationName}</p>
                      </div>
                      <div className="mt-0.5 flex gap-4 text-sm text-slate-500">
                        {therapy.dosage    && <span>Dose: {therapy.dosage}</span>}
                        {therapy.frequency && <span>Frequency: {therapy.frequency}</span>}
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(therapy)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deleteConfirmId === therapy.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={saveProfile.isPending}
                            onClick={() => therapy.id && handleDelete(therapy.id)}
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
                          onClick={() => therapy.id && setDeleteConfirmId(therapy.id)}
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
          setEditingTherapy(null);
        }}
        title={editingTherapy ? "Edit therapy" : "Add therapy"}
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

          {/* Medication name — backed by the system catalogue via <datalist> */}
          <div className="space-y-1.5">
            <Label htmlFor="medicationName">Medication name *</Label>
            <Input
              id="medicationName"
              list="therapy-catalogue"
              placeholder="e.g. Aspirin, Metformin, Lisinopril"
              {...form.register("medicationName")}
              aria-invalid={!!form.formState.errors.medicationName}
            />
            {/* Wires GET /api/therapies catalogue to browser-native autocomplete */}
            <datalist id="therapy-catalogue">
              {catalogueItems.map((item) => (
                <option key={item.id ?? item.medicationName} value={item.medicationName} />
              ))}
            </datalist>
            {form.formState.errors.medicationName && (
              <p className="text-xs text-red-500">
                {form.formState.errors.medicationName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                placeholder="e.g. 500mg, 5ml"
                {...form.register("dosage")}
                aria-invalid={!!form.formState.errors.dosage}
              />
              {form.formState.errors.dosage && (
                <p className="text-xs text-red-500">{form.formState.errors.dosage.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="frequency">Frequency</Label>
              <Input
                id="frequency"
                placeholder="e.g. twice daily"
                {...form.register("frequency")}
                aria-invalid={!!form.formState.errors.frequency}
              />
              {form.formState.errors.frequency && (
                <p className="text-xs text-red-500">{form.formState.errors.frequency.message}</p>
              )}
            </div>
          </div>

          {saveProfile.isError && <ErrorMessage error={saveProfile.error} />}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving…" : editingTherapy ? "Update" : "Add therapy"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingTherapy(null);
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
