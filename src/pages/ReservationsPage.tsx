import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getReservationsByUserId } from "@/api/reservations";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatInstant } from "@/lib/utils";
import type { ReservationStatus } from "@/types/api";

const STATUS_VARIANT: Record<ReservationStatus, "info" | "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  READY: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  EXPIRED: "danger",
};

export function ReservationsPage() {
  const [searchParams] = useSearchParams();
  const justCreatedId = searchParams.get("just");

  // Same pattern as Orders/Profile: manual user-id lookup until the backend
  // grows a /api/auth/me endpoint. Default 2 = seeded user@example.com.
  const [userIdInput, setUserIdInput] = useState("2");
  const userId = Number(userIdInput);

  const query = useQuery({
    queryKey: ["reservations", { userId }],
    queryFn: () => getReservationsByUserId(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">My reservations</h1>
      <p className="mb-6 text-slate-600">
        Reservations from{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">pharmacy-inventory-service</code>.
      </p>

      {justCreatedId && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Reservation #{justCreatedId} created. Picks expire in 24 hours.
        </div>
      )}

      <div className="mb-6 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            type="number"
            min={1}
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
          />
        </div>
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && <p className="text-slate-500">Loading reservations…</p>}

      {query.data && query.data.length === 0 && (
        <p className="text-slate-600">No reservations for user {userIdInput}.</p>
      )}

      {query.data && query.data.length > 0 && (
        <div className="space-y-3">
          {query.data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Reservation #{r.id}</CardTitle>
                  <p className="text-sm text-slate-500">
                    Product #{r.productId} at pharmacy #{r.pharmacyId} · qty {r.quantity}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>{r.status}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">
                  Reserved {formatInstant(r.reservedAt)}
                  {r.expiresAt && ` · expires ${formatInstant(r.expiresAt)}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
