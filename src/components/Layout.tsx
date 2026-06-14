import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowLeft,
  Building2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  Package,
  Pill,
  Repeat,
  Search,
  ReceiptText,
  ShoppingCart,
  UserCircle,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCategories } from "@/api/products";
import type { AuthUser } from "@/auth/context";
import { useAuth } from "@/auth/useAuth";
import { useCart } from "@/cart/useCart";
import { FaqChatBubble } from "@/components/FaqChatBubble";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import type { CategoryDTO, Role } from "@/types/api";

type NavItemConfig = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  description?: string;
  group?: string;
};

const CUSTOMER_EXPLORE_NAV: NavItemConfig[] = [
  { to: "/pharmacies", label: "Pharmacies", icon: Building2 },
  { to: "/symptoms", label: "Symptoms", icon: Search },
];

const CUSTOMER_CARE_NAV: NavItemConfig[] = [
  { to: "/my-care", label: "Dashboard", icon: Home, end: true, group: "Overview" },
  { to: "/orders", label: "My orders", icon: ReceiptText },
  { to: "/prescriptions", label: "Prescriptions", icon: FileText },
  { to: "/reservations", label: "Reservations", icon: ClipboardList },
  {
    to: "/auto-refills",
    label: "Auto-refills",
    icon: Repeat,
    description: "Manage recurring therapy refills.",
  },
  { to: "/health/reminders", label: "Therapy reminders", icon: AlarmClock },
  { to: "/health", label: "Health record", icon: HeartPulse, end: true, group: "Health" },
];

const CUSTOMER_CARE_NAV_GROUPS: Record<string, string[]> = {
  Overview: ["/my-care"],
  "Care activity": ["/orders", "/prescriptions", "/reservations", "/auto-refills", "/health/reminders"],
  Health: ["/health"],
};

const STAFF_WORKFLOW_NAV: Partial<Record<Role, NavItemConfig[]>> = {
  ROLE_PHARMACIST: [
    { to: "/orders", label: "Orders", icon: ReceiptText },
    { to: "/prescriptions", label: "Prescriptions", icon: FileText },
    { to: "/reservations", label: "Reservations", icon: ClipboardList },
    { to: "/interactions", label: "Interaction review", icon: Pill },
    { to: "/products", label: "Inventory / Products", icon: Package },
  ],
  ROLE_DOCTOR: [
    { to: "/prescriptions", label: "Prescriptions", icon: FileText },
    { to: "/interactions", label: "Interaction review", icon: Pill },
    { to: "/health/therapies", label: "Therapy review", icon: HeartPulse },
  ],
  ROLE_ADMIN: [
    { to: "/products", label: "Products / Catalog", icon: Package },
    { to: "/pharmacies", label: "Pharmacies", icon: Building2 },
    { to: "/orders", label: "Orders", icon: ReceiptText },
    { to: "/prescriptions", label: "Prescriptions", icon: FileText },
    { to: "/reservations", label: "Reservations", icon: ClipboardList },
    { to: "/interactions", label: "Interaction review", icon: Pill },
  ],
};

const ADMIN_TOOL_NAV: NavItemConfig[] = [
  { to: "/admin/fraud", label: "Fraud review", icon: Search },
  { to: "/admin/recommendations", label: "Recommendations", icon: HeartPulse },
  { to: "/admin/faqs", label: "FAQ content", icon: FileText },
  { to: "/admin/faq-logs", label: "FAQ logs", icon: ClipboardList },
  { to: "/categories", label: "Categories", icon: Package },
];

const PRIMARY_NAV_PATHS = new Set([
  "/",
  "/admin",
  "/dashboard",
  "/products",
  "/pharmacies",
  "/symptoms",
  "/orders",
  "/prescriptions",
  "/reservations",
  "/auto-refills",
  "/health/reminders",
  "/health",
  "/health/therapies",
  "/interactions",
  "/admin/fraud",
  "/admin/recommendations",
  "/admin/faqs",
  "/admin/faq-logs",
  "/categories",
  "/my-care",
  "/profile",
  "/notifications",
  "/cart",
]);

function workspaceRole(user: AuthUser | null): Role | "customer" {
  if (!user) return "customer";
  if (user.roles.includes("ROLE_ADMIN")) return "ROLE_ADMIN";
  if (user.roles.includes("ROLE_PHARMACIST")) return "ROLE_PHARMACIST";
  if (user.roles.includes("ROLE_DOCTOR")) return "ROLE_DOCTOR";
  return "customer";
}

export function Layout() {
  const { user, logout, loading, hasRole } = useAuth();
  const cart = useCart();
  const isAdmin = hasRole("ROLE_ADMIN");
  const role = workspaceRole(user);
  const isCustomerWorkspace = role === "customer";
  const location = useLocation();
  const navigate = useNavigate();
  const showBackButton = !PRIMARY_NAV_PATHS.has(location.pathname);
  const showFaqChat = Boolean(user) && !isAdmin && !location.pathname.startsWith("/admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const categories = useQuery({
    queryKey: ["categories", "nav"],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const workflowItems = role === "customer" ? [] : STAFF_WORKFLOW_NAV[role] ?? [];
  const mobileNavItems =
    role === "customer"
      ? [
          { to: "/", label: "Home", end: true },
          ...CUSTOMER_EXPLORE_NAV,
          ...CUSTOMER_CARE_NAV,
        ]
      : [
          { to: role === "ROLE_ADMIN" ? "/admin" : "/dashboard", label: "Dashboard", end: true },
          ...workflowItems,
          ...(role === "ROLE_ADMIN" ? ADMIN_TOOL_NAV : []),
        ];

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/[0.03] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10 xl:w-[80vw] xl:px-0">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Pill className="h-4 w-4" />
              </span>
              <span>PharmaFlow</span>
            </NavLink>
            <nav className="hidden items-center gap-1 xl:flex">
              {isCustomerWorkspace ? (
                <>
                  <NavTab to="/" end>
                    Home
                  </NavTab>
                  <ProductNavDropdown categories={categories.data ?? []} />
                  <NavDropdown label="Explore" items={CUSTOMER_EXPLORE_NAV} />
                  {user && (
                    <NavDropdown
                      label="My care"
                      items={CUSTOMER_CARE_NAV}
                      groups={CUSTOMER_CARE_NAV_GROUPS}
                    />
                  )}
                </>
              ) : (
                <>
                  <NavTab to={role === "ROLE_ADMIN" ? "/admin" : "/dashboard"} end>
                    Dashboard
                  </NavTab>
                  <NavDropdown label="Workflows" items={workflowItems} />
                  {role === "ROLE_ADMIN" && <NavDropdown label="Admin tools" items={ADMIN_TOOL_NAV} />}
                </>
              )}
            </nav>
          </div>

          {/* Desktop user section */}
          <div className="hidden items-center gap-3 xl:flex">
            {isCustomerWorkspace && <CartIconLink count={cart.itemCount} />}
            {user ? (
              <>
                <NotificationBell />
                <AccountMenu user={user} logout={logout} loggingOut={loading} />
              </>
            ) : (
              <>
                <NavTab to="/login">Log in</NavTab>
                <Link
                  to="/register"
                  className="inline-flex h-9 items-center rounded-2xl bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions: notification bell + hamburger toggle */}
          <div className="flex items-center gap-2 xl:hidden">
            {isCustomerWorkspace && <CartIconLink count={cart.itemCount} />}
            {user && <NotificationBell />}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown panel */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white/95 shadow-lg shadow-slate-900/5 xl:hidden">
            <nav className="mx-auto flex w-full max-w-[1500px] flex-col gap-1 px-4 py-4 sm:px-6 lg:px-10">
              {mobileNavItems.map((item) => (
                <NavTab key={item.to} to={item.to} end={item.end} onNavigate={() => setMenuOpen(false)}>
                  {item.label}
                </NavTab>
              ))}
              {isCustomerWorkspace && (
                <MobileProductsMenu
                  categories={categories.data ?? []}
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
            </nav>
            {user ? (
              <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-1 border-t border-slate-200 px-4 py-4 sm:px-6 lg:px-10">
                <NavTab to="/profile" onNavigate={() => setMenuOpen(false)}>
                  Profile
                </NavTab>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  disabled={loading}
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  {loading ? "Logging out..." : "Log out"}
                </button>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-1 border-t border-slate-200 px-4 py-4 sm:px-6 lg:px-10">
                <NavTab to="/login" onNavigate={() => setMenuOpen(false)}>
                  Log in
                </NavTab>
                <NavTab to="/register" onNavigate={() => setMenuOpen(false)}>
                  Register
                </NavTab>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-8 sm:px-6 lg:px-10 xl:w-[80vw] xl:px-0">
        {showBackButton && (
          <button
            type="button"
            onClick={goBack}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <Outlet />
      </main>
      <AppFooter />
      {showFaqChat && <FaqChatBubble key={user?.userId ?? user?.email ?? "anonymous"} />}
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white/80">
      <div className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-10 xl:w-[80vw] xl:px-0">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Pill className="h-6 w-6 text-brand-600" />
            PharmaFlow
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            PharmaFlow helps you browse pharmacy products and manage care workflows. It does not
            replace professional medical advice.
          </p>
        </div>

        <FooterColumn
          title="Shop"
          links={[
            { to: "/", label: "Home" },
            { to: "/products", label: "Products" },
            { to: "/pharmacies", label: "Pharmacies" },
            { to: "/symptoms", label: "Symptoms" },
            { to: "/cart", label: "Cart" },
          ]}
        />
        <FooterColumn
          title="Care"
          links={[
            { to: "/my-care", label: "My Care" },
            { to: "/profile", label: "Profile" },
            { to: "/notifications", label: "Notifications" },
            { to: "/health/reminders", label: "Therapy reminders" },
            { to: "/prescriptions", label: "Prescriptions" },
          ]}
        />
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PharmaFlow. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-extrabold text-ink-800">{title}</h2>
      <nav className="mt-3 grid gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-sm text-slate-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function CartIconLink({ count }: { count: number }) {
  return (
    <NavLink
      to="/cart"
      aria-label={count > 0 ? `Cart with ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      className={({ isActive }) =>
        cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )
      }
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </NavLink>
  );
}

function ProductNavDropdown({
  categories,
}: {
  categories: CategoryDTO[];
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const isActive = location.pathname.startsWith("/products");
  const groups = groupProductCategories(categories);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Products
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="dropdown-enter absolute left-0 top-11 z-50 w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/12">
          <div className="border-b border-slate-100 bg-brand-50/60 px-5 py-4">
            <h2 className="text-sm font-extrabold text-ink-800">Shop products</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">Browse the full catalog or jump into grouped categories.</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            <NavLink
              to="/products"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "mb-3 flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-200">
                <Home className="h-4 w-4" />
              </span>
              All products
            </NavLink>
            <div className="grid gap-3 md:grid-cols-2">
              {groups.map((group) => (
                <div key={group.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="px-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    {group.title}
                  </p>
                  <div className="mt-2 grid gap-1">
                    {group.categories.map((category) => (
                      <NavLink
                        key={category.id}
                        to={`/products?categoryId=${category.id}`}
                        onClick={() => setOpen(false)}
                        className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        {category.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/products"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex h-10 items-center rounded-xl px-3 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              View all categories
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileProductsMenu({
  categories,
  onNavigate,
}: {
  categories: CategoryDTO[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = groupProductCategories(categories, 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold text-slate-700"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Products
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 px-3 py-3">
          <NavTab to="/products" onNavigate={onNavigate}>
            All products
          </NavTab>
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                {group.title}
              </p>
              <div className="grid gap-1">
                {group.categories.map((category) => (
                  <NavTab
                    key={category.id}
                    to={`/products?categoryId=${category.id}`}
                    onNavigate={onNavigate}
                  >
                    {category.name}
                  </NavTab>
                ))}
              </div>
            </div>
          ))}
          <NavTab to="/products" onNavigate={onNavigate}>
            View all categories
          </NavTab>
        </div>
      )}
    </div>
  );
}

function groupProductCategories(categories: CategoryDTO[], limitPerGroup = 4) {
  const groupDefinitions = [
    {
      title: "Common care",
      keywords: ["pain", "cold", "flu", "respir", "allerg", "cough", "fever"],
    },
    {
      title: "Medicines",
      keywords: ["antibiotic", "gastro", "cardio", "medication", "medicine", "digest", "diabetes"],
    },
    {
      title: "Wellness",
      keywords: ["vitamin", "supplement", "skin", "derm", "first aid", "wellness", "care"],
    },
  ];
  const assigned = new Set<number>();

  const groups = groupDefinitions
    .map((definition) => {
      const matches = categories
        .filter((category) => {
          const name = category.name.toLowerCase();
          const matched = definition.keywords.some((keyword) => name.includes(keyword));
          if (matched) assigned.add(category.id);
          return matched;
        })
        .slice(0, limitPerGroup);
      return { title: definition.title, categories: matches };
    })
    .filter((group) => group.categories.length > 0);

  const otherCategories = categories
    .filter((category) => !assigned.has(category.id))
    .slice(0, limitPerGroup);

  if (otherCategories.length > 0) {
    groups.push({ title: "Other categories", categories: otherCategories });
  }

  return groups;
}

function AccountMenu({
  user,
  logout,
  loggingOut,
}: {
  user: AuthUser;
  logout: () => Promise<void>;
  loggingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user.email;
  const accountSubtitle = user.firstName ? user.email : "Signed in";
  const initials = userInitials(user);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <UserCircle className="h-5 w-5" />
      </button>

      {open && (
        <div className="dropdown-enter absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/12">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-brand-50/70 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
              <span className="text-sm font-extrabold" aria-hidden="true">
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold text-ink-800" title={displayName}>
                {displayName}
              </h2>
              <p className="mt-1 truncate text-xs text-slate-600" title={accountSubtitle}>
                {accountSubtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-1 p-2">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <span>View profile</span>
              <ExternalLink className="h-4 w-4" />
            </Link>

            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void logout()}
              disabled={loggingOut}
            >
              <span>{loggingOut ? "Logging out..." : "Log out"}</span>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function userInitials(user: AuthUser) {
  const first = firstGrapheme(user.firstName);
  const last = firstGrapheme(user.lastName);
  const email = firstGrapheme(user.email);
  return `${first}${last}` || email || "U";
}

function firstGrapheme(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const first = segmenter.segment(trimmed)[Symbol.iterator]().next().value;
    return first?.segment ?? "";
  }
  return Array.from(trimmed)[0] ?? "";
}

function NavDropdown({
  label,
  items,
  groups,
}: {
  label: string;
  items: NavItemConfig[];
  groups?: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const isActive = items.some((item) => location.pathname.startsWith(item.to));
  const groupedItems = groups
    ? Object.entries(groups)
        .map(([groupLabel, routes]) => ({
          groupLabel,
          items: routes
            .map((route) => items.find((item) => item.to === route))
            .filter(Boolean) as NavItemConfig[],
        }))
        .filter((group) => group.items.length > 0)
    : [{ groupLabel: "", items }];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="dropdown-enter absolute left-0 top-11 z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/12">
          <div className="border-b border-slate-100 bg-brand-50/70 px-4 py-3">
            <h2 className="text-sm font-extrabold text-ink-800">{label}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {label === "My care" ? "Orders, prescriptions, reminders, and health." : "Pharmacies, symptoms, and clinical tools."}
            </p>
          </div>

          <div className="grid gap-2 p-2">
            {groupedItems.map((group) => (
              <div key={group.groupLabel || "items"}>
                {group.groupLabel && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                    {group.groupLabel}
                  </p>
                )}
                <div className="grid gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                            isActive
                              ? "bg-brand-100/80 text-brand-800"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          )
                        }
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-200">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block">{item.label}</span>
                          {item.description && (
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                              {item.description}
                            </span>
                          )}
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NavTab({
  to,
  end,
  children,
  onNavigate,
}: {
  to: string;
  end?: boolean;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "rounded-2xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )
      }
    >
      {children}
    </NavLink>
  );
}
