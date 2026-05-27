import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Pencil,
  Pill,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/api/users";
import { createPatientProfile, updatePatientProfile } from "@/api/health";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { BloodType, PatientProfileDTO, Severity } from "@/types/api";
import {
  BLOOD_TYPE_LABELS,
  SEVERITY_LABELS,
} from "@/types/api";

const severityVariant: Record<Severity, "info" | "warning" | "success" | "danger"> = {
  LOW: "success",
  MODERATE: "warning",
  HIGH: "warning",
  SEVERE: "danger",
  LIFE_THREATENING: "danger",
};

const BLOOD_TYPES: BloodType[] = [
  "A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE",
  "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE",
];

const profileSchema = z.object({
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
type ProfileForm = z.infer<typeof profileSchema>;

export function HealthPage() {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const profile = user?.patientProfile;

  const bmi =
    profile?.weight && profile?.height
      ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
      : null;

  // ── Health profile edit form ───────────────────────────────────────────
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          bloodType: profile.bloodType ?? "",
          height: profile.height?.toString() ?? "",
          weight: profile.weight?.toString() ?? "",
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const updated: PatientProfileDTO = {
        ...(profile ?? { allergies: [], therapies: [] }),
        bloodType: (values.bloodType as BloodType) || undefined,
        height: values.height ? parseFloat(values.height) : undefined,
        weight: values.weight ? parseFloat(values.weight) : undefined,
      };

      if (profile?.id) {
        return updatePatientProfile(profile.id, updated);
      }
      // No profile yet — create one (registered users always have one from the
      // backend, but this handles edge cases).
      return createPatientProfile(updated);
    },
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(["currentUser"], (prev: typeof user) =>
        prev ? { ...prev, patientProfile: savedProfile } : prev
      );
      setEditingProfile(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Health</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your personal health profile, allergies, therapies, and family members.
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Blood type" value={profile?.bloodType ? BLOOD_TYPE_LABELS[profile.bloodType] : "—"} />
        <StatCard
          label="Height"
          value={profile?.height ? `${profile.height} cm` : "—"}
        />
        <StatCard
          label="Weight"
          value={profile?.weight ? `${profile.weight} kg` : "—"}
        />
        <StatCard label="BMI" value={bmi ?? "—"} />
      </div>

      {/* ── Health profile edit card ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Profile
            </CardTitle>
            {!editingProfile && (
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!editingProfile ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <DetailItem
                label="Blood type"
                value={profile?.bloodType ? BLOOD_TYPE_LABELS[profile.bloodType] : "Not set"}
              />
              <DetailItem
                label="Height"
                value={profile?.height ? `${profile.height} cm` : "Not set"}
              />
              <DetailItem
                label="Weight"
                value={profile?.weight ? `${profile.weight} kg` : "Not set"}
              />
            </dl>
          ) : (
            <form
              onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bloodType">Blood type</Label>
                  <Select id="bloodType" {...form.register("bloodType")}>
                    <option value="">Select…</option>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {BLOOD_TYPE_LABELS[bt]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 175"
                    {...form.register("height")}
                  />
                  {form.formState.errors.height && (
                    <p className="text-xs text-red-500">{form.formState.errors.height.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 75"
                    {...form.register("weight")}
                  />
                  {form.formState.errors.weight && (
                    <p className="text-xs text-red-500">{form.formState.errors.weight.message}</p>
                  )}
                </div>
              </div>

              {saveMutation.isError && <ErrorMessage error={saveMutation.error} />}

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setEditingProfile(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Allergies summary ────────────────────────────────────────────── */}
      <SectionSummaryCard
        icon={<AlertTriangle className="h-4 w-4" />}
        title="Allergies"
        count={profile?.allergies?.length ?? 0}
        manageHref="/health/allergies"
      >
        {profile?.allergies && profile.allergies.length > 0 ? (
          <ul className="space-y-1.5">
            {profile.allergies.slice(0, 4).map((a, i) => (
              <li key={a.id ?? i} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{a.allergen}</span>
                {a.severity && (
                  <Badge variant={severityVariant[a.severity]}>
                    {SEVERITY_LABELS[a.severity]}
                  </Badge>
                )}
              </li>
            ))}
            {profile.allergies.length > 4 && (
              <li className="text-xs text-slate-400">
                +{profile.allergies.length - 4} more
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No allergies recorded.</p>
        )}
      </SectionSummaryCard>

      {/* ── Therapies summary ────────────────────────────────────────────── */}
      <SectionSummaryCard
        icon={<Pill className="h-4 w-4" />}
        title="Active Therapies"
        count={profile?.therapies?.length ?? 0}
        manageHref="/health/therapies"
      >
        {profile?.therapies && profile.therapies.length > 0 ? (
          <ul className="space-y-1.5">
            {profile.therapies.slice(0, 4).map((t, i) => (
              <li key={t.id ?? i} className="text-sm">
                <span className="font-medium text-slate-800">{t.medicationName}</span>
                {(t.dosage || t.frequency) && (
                  <span className="ml-2 text-slate-500">
                    {[t.dosage, t.frequency].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
            {profile.therapies.length > 4 && (
              <li className="text-xs text-slate-400">
                +{profile.therapies.length - 4} more
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No active therapies.</p>
        )}
      </SectionSummaryCard>

      {/* ── Family members summary ───────────────────────────────────────── */}
      <SectionSummaryCard
        icon={<Users className="h-4 w-4" />}
        title="Family Members"
        count={user?.familyMemberIds?.length ?? 0}
        manageHref="/health/family-members"
      >
        {user?.familyMemberIds && user.familyMemberIds.length > 0 ? (
          <p className="text-sm text-slate-600">
            {user.familyMemberIds.length} family member
            {user.familyMemberIds.length !== 1 ? "s" : ""} registered.
          </p>
        ) : (
          <p className="text-sm text-slate-400">No family members added yet.</p>
        )}
      </SectionSummaryCard>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function SectionSummaryCard({
  icon,
  title,
  count,
  manageHref,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  manageHref: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
            <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {count}
            </span>
          </CardTitle>
          <Link to={manageHref}>
            <Button variant="outline" size="sm">
              Manage
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
