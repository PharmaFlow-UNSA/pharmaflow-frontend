import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  FileText,
  PackageCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getOrders } from "@/api/orders";
import { getPrescriptions } from "@/api/prescriptions";
import { getDrugInteractions } from "@/api/products";
import { getReservations } from "@/api/reservations";
import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Role } from "@/types/api";

const roleTitle: Partial<Record<Role, string>> = {
  ROLE_PHARMACIST: "Pharmacist workspace",
  ROLE_DOCTOR: "Doctor workspace",
};

const roleDescription: Partial<Record<Role, string>> = {
  ROLE_PHARMACIST: "Review prescriptions, reservations, orders, and interaction alerts from one operational view.",
  ROLE_DOCTOR: "Review prescription work, medication interactions, and care-related tasks without the shopping flow.",
};

export function StaffDashboardPage() {
  const { user, hasRole } = useAuth();
  const role = hasRole("ROLE_PHARMACIST") ? "ROLE_PHARMACIST" : hasRole("ROLE_DOCTOR") ? "ROLE_DOCTOR" : undefined;

  const orders = useQuery({
    queryKey: ["orders", "staff-dashboard"],
    queryFn: () => getOrders({ page: 0, size: 5, sort: "createdAt,desc" }),
    enabled: Boolean(user),
  });
  const prescriptions = useQuery({
    queryKey: ["prescriptions", "staff-dashboard"],
    queryFn: () => getPrescriptions({ page: 0, size: 5, sort: "uploadedAt,desc" }),
    enabled: Boolean(user),
  });
  const reservations = useQuery({
    queryKey: ["reservations", "staff-dashboard"],
    queryFn: () => getReservations({ page: 0, size: 5, sort: "reservedAt,desc" }),
    enabled: Boolean(user),
  });
  const interactions = useQuery({
    queryKey: ["interactions", "staff-dashboard"],
    queryFn: getDrugInteractions,
    staleTime: 60_000,
  });

  const orderItems = orders.data?.content ?? [];
  const prescriptionItems = prescriptions.data?.content ?? [];
  const reservationItems = reservations.data?.content ?? [];
  const interactionItems = interactions.data ?? [];

  return (
    <div className="space-y-7 animate-section">
      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_88%_18%,rgba(34,197,94,0.22),transparent_24%),linear-gradient(135deg,#0f172a_0%,#172554_66%,#0f766e_100%)] p-7 text-white shadow-lg shadow-slate-900/10 lg:p-8">
        <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-100 ring-1 ring-white/15">
          Professional dashboard
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {role ? roleTitle[role] : "Staff workspace"}
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-200">
          {role ? roleDescription[role] : "Review operational tasks and care workflows from one focused workspace."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileText} label="Pending prescriptions" value={prescriptionItems.filter((rx) => rx.status === "PENDING").length} loading={prescriptions.isLoading} />
        <MetricCard icon={PackageCheck} label="Open orders" value={orderItems.filter((order) => order.status !== "DELIVERED" && order.status !== "CANCELLED").length} loading={orders.isLoading} />
        <MetricCard icon={ClipboardList} label="Active reservations" value={reservationItems.filter((reservation) => reservation.status === "PENDING" || reservation.status === "READY").length} loading={reservations.isLoading} />
        <MetricCard icon={AlertTriangle} label="Major interactions" value={interactionItems.filter((interaction) => interaction.severity === "MAJOR").length} loading={interactions.isLoading} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-brand-700" />
              Review queues
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QueueLink to="/prescriptions" title="Prescriptions" count={prescriptionItems.length} detail="Review uploaded prescription records." />
            <QueueLink to="/orders" title="Orders / fulfillment" count={orderItems.length} detail="Check recent order status and payment details." />
            <QueueLink to="/reservations" title="Reservations" count={reservationItems.length} detail="Monitor reservation status and pickup queues." />
            <QueueLink to="/interactions" title="Interaction review" count={interactionItems.length} detail="Review known medication interaction records." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-brand-700" />
              Workspace shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {hasRole("ROLE_PHARMACIST") && (
              <QueueLink to="/products" title="Product inventory reference" detail="Open catalog and availability information." />
            )}
            {hasRole("ROLE_DOCTOR") && (
              <QueueLink to="/health/therapies" title="Therapy review" detail="Review medication and therapy records available to your role." />
            )}
            <QueueLink to="/notifications" title="Notifications" detail="Review recent operational notifications." />
            <QueueLink to="/profile" title="Profile" detail="Manage your account details." />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="hover-lift">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-800">{loading ? "..." : value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueLink({
  to,
  title,
  detail,
  count,
}: {
  to: string;
  title: string;
  detail: string;
  count?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span>
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{detail}</span>
      </span>
      {typeof count === "number" && <Badge variant="info">{count}</Badge>}
    </Link>
  );
}
