import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, KeyRound, Pencil, User } from "lucide-react";
import { changePassword } from "@/api/auth";
import { getCurrentUser, updateCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/toast/useToast";
import type { Role } from "@/types/api";

const roleBadgeVariant: Record<Role, "info" | "warning" | "success" | "danger"> = {
  ROLE_USER: "info",
  ROLE_DOCTOR: "success",
  ROLE_PHARMACIST: "warning",
  ROLE_ADMIN: "danger",
};

const roleLabel: Record<Role, string> = {
  ROLE_USER: "Patient",
  ROLE_DOCTOR: "Doctor",
  ROLE_PHARMACIST: "Pharmacist",
  ROLE_ADMIN: "Administrator",
};

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(50, "Keep first name under 50 characters.")
    .regex(/^[\p{L}\s'-]+$/u, "Only letters, spaces, hyphens and apostrophes."),
  lastName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(50, "Keep last name under 50 characters.")
    .regex(/^[\p{L}\s'-]+$/u, "Only letters, spaces, hyphens and apostrophes."),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(6, "Use at least 6 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editingProfile, setEditingProfile] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const { data: userData, isLoading, isError, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  // ── Profile edit form ──────────────────────────────────────────────────
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: userData ? { firstName: userData.firstName, lastName: userData.lastName } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updated) => {
      queryClient.setQueryData(["currentUser"], updated);
      setEditingProfile(false);
      toast.success("Profile updated.");
    },
  });

  // ── Password change form ───────────────────────────────────────────────
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      setPasswordSuccess(true);
      passwordForm.reset();
      toast.success("Password changed.");
      setTimeout(() => setPasswordSuccess(false), 4000);
    },
  });

  return (
    <div className="space-y-8 animate-section">
      <section className="rounded-[2rem] bg-[radial-gradient(circle_at_85%_20%,rgba(34,197,94,0.24),transparent_24%),linear-gradient(135deg,#0f172a_0%,#13215f_62%,#0f766e_100%)] p-7 text-white shadow-lg shadow-slate-900/10 lg:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-brand-100 ring-1 ring-white/15">
            <User className="h-8 w-8" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-100">Account</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {userData ? `${userData.firstName} ${userData.lastName}` : "Your profile"}
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-200">
              Manage account identity and password settings.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl">
        <p className="text-sm text-slate-500">
          Manage your identity. Health data is on the{" "}
          <a href="/health" className="font-medium text-brand-600 hover:underline">
            Health
          </a>{" "}
          page.
        </p>
      </div>

      {/* ── Identity card ───────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Identity
            </CardTitle>
            {!editingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProfile(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {isError && <ErrorMessage error={error} />}

          {userData && !editingProfile && (
            <dl className="space-y-3 text-sm">
              <Row label="Full name" value={`${userData.firstName} ${userData.lastName}`} />
              <Row label="Email" value={userData.email} />
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-500">Roles</dt>
                <dd className="col-span-2 flex flex-wrap gap-1">
                  {user?.roles.map((r) => (
                    <Badge key={r} variant={roleBadgeVariant[r]}>
                      {roleLabel[r]}
                    </Badge>
                  ))}
                </dd>
              </div>
              {userData.patientProfile && (
                <>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                      Health snapshot
                    </p>
                  </div>
                  <Row
                    label="Blood type"
                    value={userData.patientProfile.bloodType ?? "—"}
                  />
                  <Row
                    label="Height"
                    value={
                      userData.patientProfile.height
                        ? `${userData.patientProfile.height} cm`
                        : "—"
                    }
                  />
                  <Row
                    label="Weight"
                    value={
                      userData.patientProfile.weight
                        ? `${userData.patientProfile.weight} kg`
                        : "—"
                    }
                  />
                  <Row
                    label="Allergies"
                    value={String(userData.patientProfile.allergies?.length ?? 0)}
                  />
                  <Row
                    label="Therapies"
                    value={String(userData.patientProfile.therapies?.length ?? 0)}
                  />
                </>
              )}
            </dl>
          )}

          {userData && editingProfile && (
            <form
              onSubmit={profileForm.handleSubmit((v) => updateMutation.mutate(v))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  className="rounded-xl shadow-sm"
                  {...profileForm.register("firstName")}
                  aria-invalid={!!profileForm.formState.errors.firstName}
                  disabled={updateMutation.isPending}
                />
                {profileForm.formState.errors.firstName && (
                  <p className="text-xs text-red-500">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  className="rounded-xl shadow-sm"
                  {...profileForm.register("lastName")}
                  aria-invalid={!!profileForm.formState.errors.lastName}
                  disabled={updateMutation.isPending}
                />
                {profileForm.formState.errors.lastName && (
                  <p className="text-xs text-red-500">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>

              {updateMutation.isError && <ErrorMessage error={updateMutation.error} />}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    profileForm.reset();
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

      {/* ── Change password card ─────────────────────────────────────────── */}
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Password changed successfully.
            </div>
          )}

          <form
            onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                className="rounded-xl shadow-sm"
                autoComplete="current-password"
                {...passwordForm.register("currentPassword")}
                aria-invalid={!!passwordForm.formState.errors.currentPassword}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                className="rounded-xl shadow-sm"
                autoComplete="new-password"
                {...passwordForm.register("newPassword")}
                aria-invalid={!!passwordForm.formState.errors.newPassword}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-red-500">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="rounded-xl shadow-sm"
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword")}
                aria-invalid={!!passwordForm.formState.errors.confirmPassword}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {passwordMutation.isError && <ErrorMessage error={passwordMutation.error} />}

            <Button type="submit" className="rounded-xl" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 font-medium text-slate-900">{value}</dd>
    </div>
  );
}
