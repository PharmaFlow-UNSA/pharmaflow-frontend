import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getUserById } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function ProfilePage() {
  const { user } = useAuth();
  // The login response does not return the user's numeric id (only email + roles),
  // so we let the user pick which profile to load. In a real app we'd add /api/auth/me
  // or read the id from the JWT subject.
  const [profileId, setProfileId] = useState<string>("1");
  const numericId = Number(profileId);

  const profile = useQuery({
    queryKey: ["user", numericId],
    queryFn: () => getUserById(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Profile</h1>
      <p className="mb-6 text-slate-600">
        Identity is read from the decoded JWT. Detailed health profile comes from{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">user-health-service</code>.
      </p>

      {/* Signed-in summary (from JWT, zero network) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Signed-in identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-slate-500">Email</span>
            <span className="col-span-2 font-medium text-slate-900">{user?.email}</span>
          </div>
          {user?.firstName && (
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-500">Name</span>
              <span className="col-span-2 font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <span className="text-slate-500">Roles</span>
            <span className="col-span-2 flex flex-wrap gap-1">
              {user?.roles.map((r) => (
                <Badge key={r} variant="info">
                  {r}
                </Badge>
              ))}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Health profile lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Health profile lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="userIdInput">User id</Label>
              <Input
                id="userIdInput"
                type="number"
                min="1"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              />
            </div>
          </div>

          {profile.isError && <ErrorMessage error={profile.error} />}
          {profile.isLoading && <p className="text-slate-500">Loading…</p>}

          {profile.data && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
              <p>
                <span className="text-slate-500">Name:</span>{" "}
                <span className="font-medium">
                  {profile.data.firstName} {profile.data.lastName}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Email:</span>{" "}
                <span className="font-medium">{profile.data.email}</span>
              </p>
              {profile.data.patientProfile && (
                <p className="mt-2 text-xs text-slate-500">
                  Blood type {profile.data.patientProfile.bloodType ?? "—"}, height{" "}
                  {profile.data.patientProfile.height ?? "—"} cm, weight{" "}
                  {profile.data.patientProfile.weight ?? "—"} kg
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
