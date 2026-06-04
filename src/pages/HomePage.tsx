import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Pill,
  Repeat,
  Truck,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { getCurrentUser } from "@/api/users";
import type { Role } from "@/types/api";

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_GREETING: Record<Role, string> = {
  ROLE_USER:        "Here's a summary of your health and pharmacy activity.",
  ROLE_DOCTOR:      "Review your patients' prescriptions and health profiles.",
  ROLE_PHARMACIST:  "Manage dispensing, inventory, and reservations.",
  ROLE_ADMIN:       "Full system access — all modules are available to you.",
};

const ROLE_LABEL: Record<Role, string> = {
  ROLE_USER:        "Patient",
  ROLE_DOCTOR:      "Doctor",
  ROLE_PHARMACIST:  "Pharmacist",
  ROLE_ADMIN:       "Administrator",
};

interface NavTile {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

const NAV_TILES: NavTile[] = [
  {
    to: "/products",
    title: "Browse products",
    description: "Search the pharmaceutical catalog. Filter by manufacturer, type, or price range.",
    icon: Pill,
    iconClass: "bg-brand-50 text-brand-700",
  },
  {
    to: "/orders",
    title: "My orders",
    description: "Track open orders, payments, and linked prescriptions.",
    icon: ClipboardList,
    iconClass: "bg-amber-50 text-amber-700",
  },
  {
    to: "/prescriptions",
    title: "Prescriptions",
    description: "Upload prescription images and watch their review status.",
    icon: FileText,
    iconClass: "bg-rose-50 text-rose-700",
  },
  {
    to: "/auto-refills",
    title: "Auto-refills",
    description: "Schedule recurring refills for chronic therapy. Pause anytime.",
    icon: Repeat,
    iconClass: "bg-emerald-50 text-emerald-700",
  },
  {
    to: "/pharmacies",
    title: "Pharmacies",
    description: "Browse partner pharmacies and their inventory.",
    icon: Building2,
    iconClass: "bg-violet-50 text-violet-700",
  },
  {
    to: "/reservations",
    title: "Reservations",
    description: "Pickup reservations at local pharmacies.",
    icon: Calendar,
    iconClass: "bg-cyan-50 text-cyan-700",
  },
  {
    to: "/deliveries",
    title: "Deliveries",
    description: "Track shipments dispatched from partner pharmacies.",
    icon: Truck,
    iconClass: "bg-sky-50 text-sky-700",
  },
  {
    to: "/health",
    title: "Health record",
    description: "Allergies, active therapies, and family members' profiles.",
    icon: Activity,
    iconClass: "bg-emerald-50 text-emerald-700",
  },
  {
    to: "/profile",
    title: "Your profile",
    description: "Update your personal details and change your password.",
    icon: User,
    iconClass: "bg-slate-100 text-slate-700",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user } = useAuth();

  // Reuses the cached query from HealthPage — zero extra round-trip after
  // the user has visited any health sub-page.
  const { data: fullUser, isPending: statsLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const role       = user?.roles[0];
  const greeting   = role ? ROLE_GREETING[role] : "Here's everything you can do today.";
  const roleLabel  = role ? ROLE_LABEL[role] : null;

  const allergyCount = fullUser?.patientProfile?.allergies?.length ?? 0;
  const therapyCount = fullUser?.patientProfile?.therapies?.length ?? 0;
  const familyCount  = fullUser?.familyMemberIds?.length ?? 0;

  return (
    <div className="space-y-8">

      {/* ── Welcome banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-7 text-white shadow-sm">
        {/* decorative soft circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 right-16 h-28 w-28 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-200">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {user?.firstName ? `Hello, ${user.firstName}!` : "Welcome back!"}
            </h1>
            <p className="mt-1 text-sm text-brand-100">{greeting}</p>
          </div>

          {roleLabel && (
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white">
              {roleLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Health quick stats ──────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Your health at a glance
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            to="/health/allergies"
            icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
            iconBg="bg-amber-50"
            count={allergyCount}
            label="Allergies"
            loading={statsLoading}
          />
          <StatCard
            to="/health/therapies"
            icon={<Pill className="h-5 w-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            count={therapyCount}
            label="Active therapies"
            loading={statsLoading}
          />
          <StatCard
            to="/health/family-members"
            icon={<Users className="h-5 w-5 text-brand-600" />}
            iconBg="bg-brand-50"
            count={familyCount}
            label="Family members"
            loading={statsLoading}
          />
        </div>
      </div>

      {/* ── Navigation tiles ────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Quick access
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_TILES.map((tile) => (
            <Link key={tile.title} to={tile.to} className="group block">
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-200 hover:shadow-md">
                <div className={`mb-3 inline-flex w-fit rounded-lg p-2.5 ${tile.iconClass}`}>
                  <tile.icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-900 group-hover:text-brand-700">
                  {tile.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {tile.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  to,
  icon,
  iconBg,
  count,
  label,
  loading,
}: {
  to: string;
  icon: React.ReactNode;
  iconBg: string;
  count: number;
  label: string;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-md"
    >
      <div className={`rounded-lg p-2.5 ${iconBg}`}>{icon}</div>
      <div>
        {loading ? (
          <div className="mb-1.5 h-7 w-9 animate-pulse rounded-md bg-slate-200" />
        ) : (
          <p className="text-2xl font-bold text-slate-900">{count}</p>
        )}
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Link>
  );
}
