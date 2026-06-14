import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, ClipboardList, Clock, MapPin, PackageCheck, User } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getReservations, patchReservationStatus } from "@/api/reservations";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/toast/useToast";
import { formatInstant } from "@/lib/utils";
import type { ReservationDTO, ReservationStatus } from "@/types/api";

const STATUS_VARIANT: Record<ReservationStatus, "info" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  READY: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  EXPIRED: "danger",
};

const RES_NEXT_STATUSES: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const RES_ACTION: Record<
  ReservationStatus,
  { label: string; variant: "default" | "outline" | "destructive" }
> = {
  PENDING: { label: "Reopen as pending", variant: "outline" },
  READY: { label: "Mark ready", variant: "default" },
  COMPLETED: { label: "Complete pickup", variant: "default" },
  CANCELLED: { label: "Cancel", variant: "destructive" },
  EXPIRED: { label: "Expire", variant: "destructive" },
};

export function ReservationsPage() {
  const [searchParams] = useSearchParams();
  const justCreatedId = searchParams.get("just");
  const queryClient = useQueryClient();
  const toast = useToast();

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

  const reservations = query.data?.content ?? [];
  const stats = reservationStats(reservations);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReservationStatus }) =>
      patchReservationStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success(`Reservation #${updated.id} moved to ${updated.status.toLowerCase()}.`);
    },
    onError: () => {
      toast.error("Could not update the reservation status.");
    },
  });

  return (
    <div className="space-y-7 animate-section">
      <AdminPageHeader
        eyebrow="Pickup workflow"
        title="Reservations"
        description={
          isStaff
            ? "Review reservation requests and pickup statuses across the pharmacy workflow."
            : "Track your product reservations and pickup status in one place."
        }
        icon={ClipboardList}
        tone={isStaff ? "dark" : "light"}
        stats={[
          { label: "Pending", value: stats.PENDING },
          { label: "Ready", value: stats.READY },
          { label: "Done", value: stats.COMPLETED },
          { label: "Closed", value: stats.CANCELLED + stats.EXPIRED },
        ]}
      />

      {justCreatedId && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Reservation #{justCreatedId} was created.
        </div>
      )}

      <Card className="rounded-[1.75rem] shadow-sm">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as ReservationStatus | "");
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
                onChange={(event) => {
                  setScope(event.target.value as "mine" | "all");
                  setPage(0);
                }}
              >
                <option value="mine">My reservations</option>
                <option value="all">All accounts</option>
              </Select>
            </div>
          )}
          <div className="flex items-end">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
              {query.data ? `${query.data.totalElements} reservation(s)` : "Loading reservations"}
            </p>
          </div>
        </CardContent>
      </Card>

      {query.isError && <ErrorMessage error={query.error} />}
      {statusMutation.isError && <ErrorMessage error={statusMutation.error} />}

      {query.isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[1.75rem] bg-slate-200/70" />
          ))}
        </div>
      )}

      {query.data && query.data.content.length === 0 && (
        <EmptyState
          title="No reservations found"
          description="Change the filters or create a reservation from an available product when needed."
          icon={ClipboardList}
        />
      )}

      {query.data && query.data.content.length > 0 && (
        <div className="space-y-4">
          {query.data.content.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              isStaff={isStaff}
              busy={statusMutation.isPending}
              onStatus={(status) => statusMutation.mutate({ id: reservation.id, status })}
            />
          ))}

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-slate-600">
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

function ReservationCard({
  reservation,
  isStaff,
  busy,
  onStatus,
}: {
  reservation: ReservationDTO;
  isStaff: boolean;
  busy: boolean;
  onStatus: (status: ReservationStatus) => void;
}) {
  return (
    <Card className="rounded-[1.75rem] hover-lift">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Calendar className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-ink-800">Reservation #{reservation.id}</h2>
                <Badge variant={STATUS_VARIANT[reservation.status]} className="px-3 py-1 font-bold">
                  {reservation.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <Meta icon={PackageCheck}>
                  Product #{reservation.productId} · qty {reservation.quantity}
                </Meta>
                <Meta icon={MapPin}>
                  <Link to={`/pharmacies/${reservation.pharmacyId}`} className="font-semibold text-brand-700 hover:underline">
                    Pharmacy #{reservation.pharmacyId}
                  </Link>
                </Meta>
                {isStaff && <Meta icon={User}>Account record</Meta>}
                <Meta icon={Clock}>
                  Reserved {formatInstant(reservation.reservedAt)}
                  {reservation.expiresAt && ` · expires ${formatInstant(reservation.expiresAt)}`}
                </Meta>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            <span>Pickup status</span>
            {isStaff && RES_NEXT_STATUSES[reservation.status].length > 0 && (
              <div className="flex flex-wrap gap-2">
                {RES_NEXT_STATUSES[reservation.status].map((next) => (
                  <Button
                    key={next}
                    size="sm"
                    variant={RES_ACTION[next].variant}
                    disabled={busy}
                    onClick={() => onStatus(next)}
                  >
                    {RES_ACTION[next].label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-brand-700" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

function reservationStats(reservations: ReservationDTO[]) {
  return reservations.reduce<Record<ReservationStatus, number>>(
    (acc, reservation) => {
      acc[reservation.status] += 1;
      return acc;
    },
    { PENDING: 0, READY: 0, COMPLETED: 0, CANCELLED: 0, EXPIRED: 0 }
  );
}
