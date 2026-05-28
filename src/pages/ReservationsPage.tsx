import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getReservations } from "@/api/reservations";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatInstant } from "@/lib/utils";
import type { ReservationStatus } from "@/types/api";

const STATUS_VARIANT: Record<ReservationStatus, "info" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  READY: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  EXPIRED: "danger",
};

export function ReservationsPage() {
  const [searchParams] = useSearchParams();
  const justCreatedId = searchParams.get("just");

  const { hasRole } = useAuth();
  const isStaff = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");

  const [scope, setScope] = useState<"mine" | "all">(isStaff ? "all" : "mine");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [page, setPage] = useState(0);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const userId = scope === "mine" ? currentUser?.id : undefined;

  const query = useQuery({
    queryKey: ["reservations", { userId, statusFilter, page }],
    queryFn: () =>
      getReservations({
        page,
        size: 10,
        sort: "reservedAt,desc",
        userId,
        status: statusFilter || undefined,
      }),
    enabled: scope === "all" || !!currentUser?.id,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Reservations</h1>
      <p className="mb-6 text-slate-600">
        Pickup reservations from{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
          pharmacy-inventory-service
        </code>
        .
      </p>

      {justCreatedId && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Reservation #{justCreatedId} created. Picks expire in 24 hours.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReservationStatus | "");
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="READY">Ready for pickup</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </div>
        {isStaff && (
          <div className="space-y-1.5">
            <Label htmlFor="scope">Scope</Label>
            <Select
              id="scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as "mine" | "all");
                setPage(0);
              }}
            >
              <option value="mine">My reservations</option>
              <option value="all">All users (staff)</option>
            </Select>
          </div>
        )}
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && <p className="text-slate-500">Loading reservations…</p>}

      {query.data && query.data.content.length === 0 && (
        <p className="text-slate-600">No reservations match these filters.</p>
      )}

      {query.data && query.data.content.length > 0 && (
        <div className="space-y-3">
          {query.data.content.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Reservation #{r.id}</CardTitle>
                    <p className="text-sm text-slate-500">
                      Product #{r.productId} at{" "}
                      <Link
                        to={`/pharmacies/${r.pharmacyId}`}
                        className="text-brand-700 hover:underline"
                      >
                        pharmacy #{r.pharmacyId}
                      </Link>{" "}
                      · qty {r.quantity}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500">
                  Reserved {formatInstant(r.reservedAt)}
                  {r.expiresAt && ` · expires ${formatInstant(r.expiresAt)}`}
                </p>
              </CardContent>
            </Card>
          ))}

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {query.data.number + 1} of {Math.max(1, query.data.totalPages)} ·{" "}
              {query.data.totalElements} reservation(s)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
