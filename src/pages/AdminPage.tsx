import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  FileQuestion,
  FileText,
  HeartPulse,
  MessageSquareText,
  PackageSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getFraudChecks, getFraudRules } from "@/api/fraud";
import { getOrders } from "@/api/orders";
import { getPharmacies } from "@/api/pharmacies";
import { getPrescriptions } from "@/api/prescriptions";
import { getDrugInteractions, getProducts } from "@/api/products";
import { getReservations } from "@/api/reservations";
import { AdminPageHeader, AdminQuickLink, EmptyState, StatCard } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatInstant } from "@/lib/utils";
import type { FraudDecision, OrderDTO, PrescriptionDTO, ReservationDTO } from "@/types/api";

const decisionVariant: Record<FraudDecision, "success" | "warning" | "danger"> = {
  APPROVED: "success",
  REVIEW: "warning",
  BLOCKED: "danger",
};

export function AdminPage() {
  const ordersQuery = useQuery({
    queryKey: ["orders", "admin-dashboard"],
    queryFn: () => getOrders({ page: 0, size: 6, sort: "createdAt,desc" }),
  });
  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions", "admin-dashboard", "pending"],
    queryFn: () => getPrescriptions({ page: 0, size: 6, status: "PENDING", sort: "uploadedAt,desc" }),
  });
  const reservationsQuery = useQuery({
    queryKey: ["reservations", "admin-dashboard", "pending"],
    queryFn: () => getReservations({ page: 0, size: 6, status: "PENDING", sort: "reservedAt,desc" }),
  });
  const productsQuery = useQuery({
    queryKey: ["products", "admin-dashboard"],
    queryFn: () => getProducts({ page: 0, size: 1 }),
  });
  const pharmaciesQuery = useQuery({
    queryKey: ["pharmacies", "admin-dashboard"],
    queryFn: () => getPharmacies({ page: 0, size: 1 }),
  });
  const interactionsQuery = useQuery({
    queryKey: ["drug-interactions", "admin-dashboard"],
    queryFn: getDrugInteractions,
  });
  const checksQuery = useQuery({
    queryKey: ["fraud-checks", "admin-summary"],
    queryFn: () => getFraudChecks(),
  });
  const rulesQuery = useQuery({
    queryKey: ["fraud-rules"],
    queryFn: getFraudRules,
  });

  const checks = checksQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const reviewCount = checks.filter((check) => check.decision === "REVIEW").length;
  const blockedCount = checks.filter((check) => check.decision === "BLOCKED").length;
  const activeRules = rules.filter((rule) => rule.isActive).length;
  const pendingPrescriptions = prescriptionsQuery.data?.totalElements ?? 0;
  const pendingReservations = reservationsQuery.data?.totalElements ?? 0;
  const recentOrders = ordersQuery.data?.content ?? [];
  const recentChecks = checks.slice(0, 5);

  return (
    <div className="space-y-7">
      <AdminPageHeader
        icon={ShieldCheck}
        title="Admin dashboard"
        description="Review catalog activity, care queues, and risk alerts."
        action={
          <Link
            to="/admin/fraud"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-extrabold text-ink-800 shadow-sm transition-colors hover:bg-cyan-50"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Open fraud workspace
          </Link>
        }
        stats={[
          { label: "Pending prescriptions", value: prescriptionsQuery.isLoading ? "..." : pendingPrescriptions },
          { label: "Pending reservations", value: reservationsQuery.isLoading ? "..." : pendingReservations },
          { label: "Products", value: productsQuery.isLoading ? "..." : productsQuery.data?.totalElements ?? "No data" },
          { label: "Pharmacies", value: pharmaciesQuery.isLoading ? "..." : pharmaciesQuery.data?.totalElements ?? "No data" },
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Needs fraud review"
          value={reviewCount}
          loading={checksQuery.isLoading}
          tone="warning"
          icon={AlertTriangle}
        />
        <StatCard
          label="Blocked checks"
          value={blockedCount}
          loading={checksQuery.isLoading}
          tone="danger"
          icon={ShieldCheck}
        />
        <StatCard
          label="Active fraud rules"
          value={activeRules}
          loading={rulesQuery.isLoading}
          tone="info"
          icon={ClipboardList}
        />
        <StatCard
          label="Interaction alerts"
          value={interactionsQuery.data?.length ?? 0}
          loading={interactionsQuery.isLoading}
          tone="warning"
          icon={HeartPulse}
        />
      </section>

      {(ordersQuery.isError ||
        prescriptionsQuery.isError ||
        reservationsQuery.isError ||
        productsQuery.isError ||
        pharmaciesQuery.isError ||
        interactionsQuery.isError ||
        checksQuery.isError ||
        rulesQuery.isError) && (
        <ErrorMessage
          error={
            ordersQuery.error ??
            prescriptionsQuery.error ??
            reservationsQuery.error ??
            productsQuery.error ??
            pharmaciesQuery.error ??
            interactionsQuery.error ??
            checksQuery.error ??
            rulesQuery.error
          }
        />
      )}

      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <OperationalCard
          title="Recent orders"
          description="Latest order activity across accounts."
          actionLabel="View orders"
          actionTo="/orders"
          loading={ordersQuery.isLoading}
          emptyTitle="No orders yet"
        >
          {recentOrders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </OperationalCard>

        <OperationalCard
          title="Pending prescriptions"
          description="Uploaded prescriptions waiting for review."
          actionLabel="Review prescriptions"
          actionTo="/prescriptions"
          loading={prescriptionsQuery.isLoading}
          emptyTitle="No pending prescriptions"
        >
          {(prescriptionsQuery.data?.content ?? []).map((prescription) => (
            <PrescriptionRow key={prescription.id} prescription={prescription} />
          ))}
        </OperationalCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <OperationalCard
          title="Pending reservations"
          description="Pickup reservations waiting for attention."
          actionLabel="Open reservations"
          actionTo="/reservations"
          loading={reservationsQuery.isLoading}
          emptyTitle="No pending reservations"
        >
          {(reservationsQuery.data?.content ?? []).map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </OperationalCard>

        <Card>
          <CardHeader>
            <CardTitle>Fraud and interaction alerts</CardTitle>
            <CardDescription>Recent risk checks and interaction details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checksQuery.isLoading && <p className="text-sm text-slate-500">Loading risk checks...</p>}
            {!checksQuery.isLoading && recentChecks.length === 0 && (
              <EmptyState title="No fraud checks yet" description="Run an order check when a review is needed." />
            )}
            {recentChecks.map((check) => (
              <div key={check.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="font-semibold text-ink-800">Check #{check.id}</p>
                  <p className="text-sm text-slate-500">Order #{check.orderId} · risk {Number(check.riskScore).toFixed(1)}</p>
                </div>
                <Badge variant={decisionVariant[check.decision]}>{check.decision}</Badge>
              </div>
            ))}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {interactionsQuery.isLoading
                ? "Loading interaction details..."
                : `${interactionsQuery.data?.length ?? 0} interaction detail${interactionsQuery.data?.length === 1 ? "" : "s"} available for review.`}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminQuickLink to="/products" icon={PackageSearch} title="Catalog" description="Manage products, pricing, and availability." />
        <AdminQuickLink to="/pharmacies" icon={Building2} title="Pharmacies" description="Review pharmacy locations, contact details, and inventory coverage." />
        <AdminQuickLink to="/admin/recommendations" icon={Sparkles} title="Recommendations" description="Create and review product suggestions." />
        <AdminQuickLink to="/admin/faqs" icon={FileQuestion} title="FAQ content" description="Maintain support answers for customers." />
        <AdminQuickLink to="/admin/faq-logs" icon={MessageSquareText} title="FAQ logs" description="Review assistant conversations and matches." />
        <AdminQuickLink to="/notifications" icon={FileText} title="Notifications" description="Review care activity updates." />
      </section>
    </div>
  );
}

function OperationalCard({
  title,
  description,
  actionTo,
  actionLabel,
  loading,
  emptyTitle,
  children,
}: {
  title: string;
  description: string;
  actionTo: string;
  actionLabel: string;
  loading: boolean;
  emptyTitle: string;
  children: React.ReactNode[];
}) {
  const hasChildren = children.length > 0;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Link to={actionTo} className="text-sm font-bold text-brand-700 hover:text-brand-800">
          {actionLabel}
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {!loading && !hasChildren && <EmptyState title={emptyTitle} />}
        {children}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order }: { order: OrderDTO }) {
  return (
    <Link to={`/orders/${order.id}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50">
      <div>
        <p className="font-semibold text-ink-800">Order #{order.id}</p>
        <p className="text-sm text-slate-500">{formatInstant(order.createdAt)} · {order.orderItems.length} item(s)</p>
      </div>
      <div className="text-right">
        <Badge variant={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "info"}>{order.status}</Badge>
        <p className="mt-1 text-sm font-semibold text-slate-700">{Number(order.totalAmount).toFixed(2)} KM</p>
      </div>
    </Link>
  );
}

function PrescriptionRow({ prescription }: { prescription: PrescriptionDTO }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="font-semibold text-ink-800">Prescription #{prescription.id}</p>
        <p className="text-sm text-slate-500">Uploaded {formatInstant(prescription.uploadedAt)}</p>
      </div>
      <Badge variant="warning">{prescription.status}</Badge>
    </div>
  );
}

function ReservationRow({ reservation }: { reservation: ReservationDTO }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="font-semibold text-ink-800">Reservation #{reservation.id}</p>
        <p className="text-sm text-slate-500">Product #{reservation.productId} · Pharmacy #{reservation.pharmacyId}</p>
      </div>
      <Badge variant="warning">{reservation.status}</Badge>
    </div>
  );
}
