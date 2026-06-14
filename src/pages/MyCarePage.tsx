import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  AlarmClock,
  ArrowRight,
  Calendar,
  ClipboardList,
  FileText,
  Pill,
  Repeat,
  Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { getProductInventorySummary } from "@/api/pharmacies";
import { getProducts, getProductById } from "@/api/products";
import { getRecommendations } from "@/api/recommendations";
import { getCurrentUser } from "@/api/users";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ProductCard } from "@/components/ProductCard";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import type { InventorySummaryDTO, ProductDTO, RecommendationDTO, Role } from "@/types/api";

const ROLE_GREETING: Record<Role, string> = {
  ROLE_USER: "Your personal care workspace for prescriptions, reminders, refills, and health records.",
  ROLE_DOCTOR: "Review your patients' prescriptions and health profiles.",
  ROLE_PHARMACIST: "Manage dispensing, inventory, and reservations.",
  ROLE_ADMIN: "Full system access is available from your admin workspace.",
};

const ROLE_LABEL: Record<Role, string> = {
  ROLE_USER: "Patient",
  ROLE_DOCTOR: "Doctor",
  ROLE_PHARMACIST: "Pharmacist",
  ROLE_ADMIN: "Administrator",
};

interface ShortcutCard {
  label: string;
  description: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  priority: number;
  tone: string;
  showWhen: (context: DashboardCardContext) => boolean;
}

interface DashboardCardContext {
  isPatient: boolean;
  hasActiveDeliveries: boolean;
}

const DASHBOARD_SHORTCUTS: ShortcutCard[] = [
  {
    label: "My orders",
    description: "Track orders, payment status, and linked prescriptions.",
    route: "/orders",
    icon: ClipboardList,
    priority: 1,
    tone: "bg-amber-50 text-amber-700",
    showWhen: () => true,
  },
  {
    label: "Prescriptions",
    description: "Upload prescriptions and follow review status.",
    route: "/prescriptions",
    icon: FileText,
    priority: 2,
    tone: "bg-rose-50 text-rose-700",
    showWhen: () => true,
  },
  {
    label: "Reservations",
    description: "Manage pharmacy pickup reservations.",
    route: "/reservations",
    icon: Calendar,
    priority: 3,
    tone: "bg-cyan-50 text-cyan-700",
    showWhen: () => true,
  },
  {
    label: "Auto-refills",
    description: "Manage recurring therapy refills.",
    route: "/auto-refills",
    icon: Repeat,
    priority: 4,
    tone: "bg-emerald-50 text-emerald-700",
    showWhen: ({ isPatient }) => isPatient,
  },
  {
    label: "Therapy reminders",
    description: "Keep daily medication reminders organized.",
    route: "/health/reminders",
    icon: AlarmClock,
    priority: 5,
    tone: "bg-brand-50 text-brand-700",
    showWhen: ({ isPatient }) => isPatient,
  },
  {
    label: "Health record",
    description: "Review allergies, therapies, and family profiles.",
    route: "/health",
    icon: Activity,
    priority: 6,
    tone: "bg-sky-50 text-sky-700",
    showWhen: () => true,
  },
];

export function MyCarePage() {
  const { user } = useAuth();
  const isPatient = Boolean(user?.roles.includes("ROLE_USER"));

  const { data: fullUser, isPending: statsLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", "my-care", fullUser?.id, fullUser?.patientProfile?.id],
    queryFn: () =>
      getRecommendations({
        userId: fullUser?.id,
        patientProfileId: fullUser?.patientProfile?.id,
      }),
    enabled: Boolean(fullUser?.id) && isPatient,
    staleTime: 60_000,
    retry: 1,
  });

  const fallbackProductsQuery = useQuery({
    queryKey: ["products", "my-care-fallback"],
    queryFn: () => getProducts({ page: 0, size: 4, sort: "name,asc" }),
    enabled: isPatient,
    staleTime: 60_000,
  });

  const role = user?.roles[0];
  const greeting = role ? ROLE_GREETING[role] : "Here's everything you can do today.";
  const roleLabel = role ? ROLE_LABEL[role] : null;

  const allergyCount = fullUser?.patientProfile?.allergies?.length ?? 0;
  const therapyCount = fullUser?.patientProfile?.therapies?.length ?? 0;
  const familyCount = fullUser?.familyMemberIds?.length ?? 0;
  const activeRecommendations = useMemo(
    () =>
      (recommendationsQuery.data ?? [])
        .filter((recommendation) => recommendation.status === "ACTIVE")
        .slice(0, 3),
    [recommendationsQuery.data]
  );

  const recommendationProductQueries = useQueries({
    queries: activeRecommendations.map((recommendation) => ({
      queryKey: ["product", recommendation.productId],
      queryFn: () => getProductById(recommendation.productId),
      staleTime: 60_000,
    })),
  });

  const recommendationProductsById = useMemo(() => {
    const products = new Map<number, ProductDTO>();
    recommendationProductQueries.forEach((query, index) => {
      if (query.data) products.set(activeRecommendations[index].productId, query.data);
    });
    return products;
  }, [activeRecommendations, recommendationProductQueries]);

  const fallbackProducts = fallbackProductsQuery.data?.content ?? [];
  const productsForInventory =
    activeRecommendations.length > 0
      ? Array.from(recommendationProductsById.values()).map((product) => product.id)
      : fallbackProducts.map((product) => product.id);
  const inventoryQuery = useQuery({
    queryKey: ["inventory", "my-care-products", productsForInventory],
    queryFn: () => getProductInventorySummary(productsForInventory),
    enabled: isPatient && productsForInventory.length > 0,
    staleTime: 60_000,
  });
  const summariesByProduct = useMemo(
    () => new Map(inventoryQuery.data?.map((summary) => [summary.productId, summary]) ?? []),
    [inventoryQuery.data]
  );

  const shortcuts = DASHBOARD_SHORTCUTS.filter((card) =>
    card.showWhen({ isPatient, hasActiveDeliveries: false })
  )
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);

  return (
    <div className="space-y-8 animate-section">
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.26),transparent_24%),linear-gradient(135deg,#0f172a_0%,#13215f_58%,#0f766e_100%)] px-7 py-8 text-white shadow-lg shadow-slate-900/10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-1/3 h-28 w-28 rotate-12 rounded-[2rem] bg-sky-300/10" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-100">My Care</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {user?.firstName ? `Hello, ${user.firstName}!` : "Welcome back!"}
            </h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-200">{greeting}</p>
          </div>

          {roleLabel && (
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white ring-1 ring-white/20">
              {roleLabel}
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle eyebrow="Needs attention" title="Next care actions" />
          <div className="mt-4 grid gap-3">
            <AttentionRow
              icon={FileText}
              title="Prescriptions"
              detail="Check uploads and review status before ordering."
              to="/prescriptions"
            />
            <AttentionRow
              icon={AlarmClock}
              title="Therapy reminders"
              detail={therapyCount > 0 ? `${therapyCount} active therapies in your record.` : "Add therapies to make reminders more useful."}
              to="/health/reminders"
            />
            <AttentionRow
              icon={Repeat}
              title="Auto-refills"
              detail="Manage recurring refills for eligible therapy products."
              to="/auto-refills"
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-brand-100 bg-brand-50/60 p-5 shadow-sm">
          <SectionTitle eyebrow="Health snapshot" title="Your health at a glance" />
          <div className="mt-4 grid gap-3">
            <StatCard
              to="/health/allergies"
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              count={allergyCount}
              label="Allergies"
              loading={statsLoading}
            />
            <StatCard
              to="/health/therapies"
              icon={<Pill className="h-5 w-5 text-emerald-600" />}
              count={therapyCount}
              label="Active therapies"
              loading={statsLoading}
            />
            <StatCard
              to="/health/family-members"
              icon={<Users className="h-5 w-5 text-brand-600" />}
              count={familyCount}
              label="Family members"
              loading={statsLoading}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <SectionTitle eyebrow="Care shortcuts" title="The essentials" />
          <Link
            to="/products"
            className="hidden text-sm font-bold text-brand-700 hover:text-brand-800 sm:inline-flex"
          >
            Browse products
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((card) => (
            <ShortcutTile key={card.route} card={card} />
          ))}
        </div>
      </section>

      {isPatient && (
        <ProductsToExplore
          recommendationsLoading={
            recommendationsQuery.isLoading ||
            recommendationProductQueries.some((query) => query.isLoading)
          }
          recommendationsError={recommendationsQuery.error}
          activeRecommendations={activeRecommendations}
          recommendationProductsById={recommendationProductsById}
          fallbackProducts={fallbackProducts}
          fallbackLoading={fallbackProductsQuery.isLoading}
          fallbackError={fallbackProductsQuery.error}
          summariesByProduct={summariesByProduct}
        />
      )}
    </div>
  );
}

function ProductsToExplore({
  recommendationsLoading,
  recommendationsError,
  activeRecommendations,
  recommendationProductsById,
  fallbackProducts,
  fallbackLoading,
  fallbackError,
  summariesByProduct,
}: {
  recommendationsLoading: boolean;
  recommendationsError: unknown;
  activeRecommendations: RecommendationDTO[];
  recommendationProductsById: Map<number, ProductDTO>;
  fallbackProducts: ProductDTO[];
  fallbackLoading: boolean;
  fallbackError: unknown;
  summariesByProduct: Map<number, InventorySummaryDTO>;
}) {
  const hasPersonalized = activeRecommendations.length > 0;
  const loading = recommendationsLoading || (!hasPersonalized && fallbackLoading);

  return (
    <section className="space-y-4 rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] p-5 shadow-sm lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle
          eyebrow={hasPersonalized ? "Smart features" : "Products to explore"}
          title={hasPersonalized ? "Recommended for you" : "Products to explore"}
          description={
            hasPersonalized
              ? "Based on active recommendations from PharmaFlow smart features."
              : "A small set of catalog products is shown until personalized recommendations are available."
          }
        />
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800"
        >
          View products <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {Boolean(recommendationsError) && !hasPersonalized && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Personalized recommendations are unavailable right now, so catalog products are shown instead.
        </div>
      )}
      {Boolean(fallbackError) && !hasPersonalized && <ErrorMessage error={fallbackError} />}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 rounded-3xl skeleton-shimmer" />
          ))}
        </div>
      )}

      {!loading && hasPersonalized && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              compact
              recommendation={recommendation}
              product={recommendationProductsById.get(recommendation.productId)}
            />
          ))}
        </div>
      )}

      {!loading && !hasPersonalized && fallbackProducts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fallbackProducts.slice(0, 4).map((product) => (
            <ProductCard
              key={product.id}
              compact
              product={product}
              summary={summariesByProduct.get(product.id)}
            />
          ))}
        </div>
      )}

      {!loading && !hasPersonalized && fallbackProducts.length === 0 && !fallbackError && (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
          Product suggestions will appear here once catalog products are available.
        </div>
      )}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink-800">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  title,
  detail,
  to,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-brand-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-200">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-slate-900 group-hover:text-brand-700">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-600">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
    </Link>
  );
}

function StatCard({
  to,
  icon,
  count,
  label,
  loading,
}: {
  to: string;
  icon: ReactNode;
  count: number;
  label: string;
  loading?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="rounded-xl bg-slate-50 p-2.5">{icon}</div>
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

function ShortcutTile({ card }: { card: ShortcutCard }) {
  const Icon = card.icon;
  return (
    <Link to={card.route} className="group block">
      <div className="flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-5 hover-lift hover:border-brand-200 hover:shadow-md focus-within:ring-2 focus-within:ring-brand-500">
        <div className={`mb-3 inline-flex w-fit rounded-xl p-2.5 ${card.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="font-semibold text-slate-900 group-hover:text-brand-700">{card.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{card.description}</p>
      </div>
    </Link>
  );
}
