import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { getCurrentUser } from "@/api/users";
import {
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMembersByUserId,
  updateFamilyMember,
} from "@/api/health";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/toast/useToast";
import type {
  BloodType,
  FamilyMemberCreatePayload,
  FamilyMemberDTO,
  Relationship,
} from "@/types/api";
import { BLOOD_TYPE_LABELS, RELATIONSHIP_LABELS } from "@/types/api";

const RELATIONSHIPS: Relationship[] = [
  "SPOUSE", "CHILD", "PARENT", "SIBLING", "GRANDPARENT", "GRANDCHILD", "OTHER",
];

const BLOOD_TYPES: BloodType[] = [
  "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
  "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE",
];

const memberSchema = z.object({
  firstName: z
    .string()
    .min(2, "At least 2 characters")
    .max(50, "Max 50 characters")
    .regex(/^[A-Za-zÀ-ÿ\s'-]+$/, "Letters, spaces, hyphens and apostrophes only"),
  relationship: z.string().min(1, "Select a relationship"),
  bloodType: z.string().optional(),
  height: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 20 && Number(v) <= 300),
      "Height must be between 20 and 300 cm"
    ),
  weight: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0.5 && Number(v) <= 500),
      "Weight must be between 0.5 and 500 kg"
    ),
});
type MemberForm = z.infer<typeof memberSchema>;

export function FamilyMembersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMemberDTO | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const toast = useToast();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const {
    data: familyMembers = [],
    isLoading: membersLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["familyMembers", user?.id],
    queryFn: () => getFamilyMembersByUserId(user!.id),
    enabled: !!user?.id,
  });

  const isLoading = userLoading || membersLoading;

  const createMutation = useMutation({
    mutationFn: createFamilyMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["familyMembers", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setShowModal(false);
      setEditingMember(null);
      toast.success("Family member added.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FamilyMemberCreatePayload }) =>
      updateFamilyMember(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["familyMembers", user?.id] });
      setShowModal(false);
      setEditingMember(null);
      toast.success("Family member updated.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFamilyMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["familyMembers", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setDeleteConfirmId(null);
      toast.success("Family member deleted.");
    },
  });

  const form = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
  });

  function openAdd() {
    form.reset({
      firstName: "",
      relationship: "",
      bloodType: "",
      height: undefined,
      weight: undefined,
    });
    setEditingMember(null);
    setShowModal(true);
  }

  function openEdit(m: FamilyMemberDTO) {
    form.reset({
      firstName: m.firstName,
      relationship: m.relationship,
      bloodType: m.patientProfile?.bloodType ?? "",
      height: m.patientProfile?.height?.toString() ?? "",
      weight: m.patientProfile?.weight?.toString() ?? "",
    });
    setEditingMember(m);
    setShowModal(true);
  }

  function handleSubmit(values: MemberForm) {
    if (!user?.id) return;

    const payload: FamilyMemberCreatePayload = {
      firstName: values.firstName,
      relationship: values.relationship as Relationship,
      userId: user.id,
      patientProfile:
        values.bloodType || values.height || values.weight
          ? {
              bloodType: (values.bloodType as BloodType) || undefined,
              height: values.height ? parseFloat(values.height) : undefined,
              weight: values.weight ? parseFloat(values.weight) : undefined,
              allergies: editingMember?.patientProfile?.allergies ?? [],
              therapies: editingMember?.patientProfile?.therapies ?? [],
            }
          : undefined,
    };

    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  return (
    <div className="space-y-7 animate-section">
      <section className="flex flex-col gap-5 rounded-[2rem] bg-[radial-gradient(circle_at_90%_15%,rgba(34,197,94,0.18),transparent_24%),linear-gradient(135deg,#eff6ff_0%,#f0fdf4_58%,#ffffff_100%)] p-7 shadow-sm ring-1 ring-sky-100 sm:flex-row sm:items-center sm:justify-between lg:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">My Care</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-800">Family members</h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-600">
              Track health profiles for your family members.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add family member
        </Button>
      </section>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}
      {isError && <ErrorMessage error={error} />}

      {!isLoading && !isError && (
        <>
          <div className="hidden justify-end">
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add family member
            </Button>
          </div>

          {familyMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No family members added yet.</p>
                <Button size="sm" className="mt-3" onClick={openAdd}>
                  Add family member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {familyMembers.map((member) => (
                <Card key={member.id} className="relative hover-lift">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{member.firstName}</CardTitle>
                        <Badge variant="info" className="mt-1">
                          {RELATIONSHIP_LABELS[member.relationship]}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(member)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {deleteConfirmId === member.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(member.id)}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(member.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {member.patientProfile ? (
                      <dl className="space-y-1 text-sm">
                        {member.patientProfile.bloodType && (
                          <ProfileRow
                            label="Blood"
                            value={BLOOD_TYPE_LABELS[member.patientProfile.bloodType]}
                          />
                        )}
                        {member.patientProfile.height && (
                          <ProfileRow
                            label="Height"
                            value={`${member.patientProfile.height} cm`}
                          />
                        )}
                        {member.patientProfile.weight && (
                          <ProfileRow
                            label="Weight"
                            value={`${member.patientProfile.weight} kg`}
                          />
                        )}
                        {(member.patientProfile.allergies?.length ?? 0) > 0 && (
                          <ProfileRow
                            label="Allergies"
                            value={String(member.patientProfile.allergies?.length)}
                          />
                        )}
                        {(member.patientProfile.therapies?.length ?? 0) > 0 && (
                          <ProfileRow
                            label="Therapies"
                            value={String(member.patientProfile.therapies?.length)}
                          />
                        )}
                      </dl>
                    ) : (
                      <p className="text-xs text-slate-400">No health profile.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {deleteMutation.isError && (
            <ErrorMessage error={deleteMutation.error} />
          )}
        </>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMember(null);
        }}
        title={editingMember ? "Edit family member" : "Add family member"}
        className="max-w-lg"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="memberFirstName">First name *</Label>
            <Input
              id="memberFirstName"
              placeholder="e.g. Ana"
              {...form.register("firstName")}
              aria-invalid={!!form.formState.errors.firstName}
            />
            {form.formState.errors.firstName && (
              <p className="text-xs text-red-500">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="relationship">Relationship *</Label>
            <Select
              id="relationship"
              {...form.register("relationship")}
              aria-invalid={!!form.formState.errors.relationship}
            >
              <option value="">Select relationship…</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {RELATIONSHIP_LABELS[r]}
                </option>
              ))}
            </Select>
            {form.formState.errors.relationship && (
              <p className="text-xs text-red-500">
                {form.formState.errors.relationship.message}
              </p>
            )}
          </div>

          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Health profile (optional)
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="memberBloodType">Blood type</Label>
              <Select id="memberBloodType" {...form.register("bloodType")}>
                <option value="">—</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {BLOOD_TYPE_LABELS[bt]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memberHeight">Height (cm)</Label>
              <Input
                id="memberHeight"
                type="number"
                step="0.1"
                placeholder="—"
                {...form.register("height")}
              />
              {form.formState.errors.height && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.height.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="memberWeight">Weight (kg)</Label>
              <Input
                id="memberWeight"
                type="number"
                step="0.1"
                placeholder="—"
                {...form.register("weight")}
              />
              {form.formState.errors.weight && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.weight.message}
                </p>
              )}
            </div>
          </div>

          {mutationError && <ErrorMessage error={mutationError} />}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isMutating}>
              {isMutating ? "Saving…" : editingMember ? "Update" : "Add member"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingMember(null);
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
