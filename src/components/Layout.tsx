import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  AlarmClock,
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  HeartPulse,
  LogOut,
  Menu,
  Pill,
  ReceiptText,
  UserCircle,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "@/auth/context";
import { useAuth } from "@/auth/useAuth";
import { FaqChatBubble } from "@/components/FaqChatBubble";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/api";

// Top-level nav items — rendered as tabs on desktop and flattened into the
// mobile dropdown. `roles`, when present, restricts the link to those roles
// (matching the route guard) so patients don't see links that bounce them.
const PRIMARY_NAV: { to: string; label: string; end?: boolean; roles?: Role[] }[] = [
  { to: "/products", label: "Products" },
  { to: "/categories", label: "Categories" },
  {
    to: "/interactions",
    label: "Interactions",
    roles: ["ROLE_DOCTOR", "ROLE_PHARMACIST", "ROLE_ADMIN"],
  },
  { to: "/pharmacies", label: "Pharmacies" },
  { to: "/symptoms", label: "Symptoms" },
];

// Grouped under the "My care" dropdown on desktop; flattened into the mobile
// dropdown. `adminLabel` overrides `label` for admins (e.g. "All orders").
const CARE_NAV: {
  to: string;
  label: string;
  adminLabel?: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}[] = [
  { to: "/orders", label: "My orders", adminLabel: "All orders", icon: ReceiptText },
  { to: "/prescriptions", label: "Prescriptions", icon: FileText },
  { to: "/reservations", label: "Reservations", icon: ClipboardList },
  { to: "/health/reminders", label: "Therapy reminders", icon: AlarmClock },
  { to: "/health", label: "Health", icon: HeartPulse, end: true },
];

export function Layout() {
  const { user, logout, loading, hasRole } = useAuth();
  const isAdmin = hasRole("ROLE_ADMIN");
  const location = useLocation();
  const navigate = useNavigate();
  const showBackButton = location.pathname !== "/";
  const showFaqChat = !isAdmin && !location.pathname.startsWith("/admin");
  const [menuOpen, setMenuOpen] = useState(false);

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const primaryItems = PRIMARY_NAV.filter(
    (item) => !item.roles || item.roles.some((role) => hasRole(role))
  );

  const careItems = CARE_NAV.map((item) => ({
    ...item,
    label: isAdmin && item.adminLabel ? item.adminLabel : item.label,
  }));

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Pill className="h-6 w-6 text-brand-600" />
              PharmaFlow
            </NavLink>
            {/* Desktop nav — the dropdown keeps the bar short, so it only needs
                to collapse to the hamburger below xl. */}
            <nav className="hidden items-center gap-1 xl:flex">
              {primaryItems.map((item) => (
                <NavTab key={item.to} to={item.to} end={item.end}>
                  {item.label}
                </NavTab>
              ))}
              <NavDropdown label="My care" items={careItems} />
            </nav>
          </div>

          {/* Desktop user section */}
          <div className="hidden items-center gap-3 xl:flex">
            {user && (
              <>
                <NotificationBell />
                <AccountMenu user={user} logout={logout} loggingOut={loading} />
              </>
            )}
          </div>

          {/* Mobile actions: notification bell + hamburger toggle */}
          <div className="flex items-center gap-2 xl:hidden">
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
          <div className="border-t border-slate-200 xl:hidden">
            <nav className="flex w-full flex-col gap-1 px-6 py-3">
              <NavTab to="/" end onNavigate={() => setMenuOpen(false)}>
                Home
              </NavTab>
              {primaryItems.map((item) => (
                <NavTab
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onNavigate={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavTab>
              ))}
              {careItems.map((item) => (
                <NavTab
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onNavigate={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavTab>
              ))}
            </nav>
            {user && (
              <div className="flex w-full flex-col gap-1 border-t border-slate-200 px-6 py-3">
                <NavTab to="/profile" onNavigate={() => setMenuOpen(false)}>
                  Profile
                </NavTab>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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
            )}
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
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
      {showFaqChat && <FaqChatBubble key={user?.userId ?? user?.email ?? "anonymous"} />}
    </div>
  );
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

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <UserCircle className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">{displayName}</h2>
              <p className="truncate text-xs text-slate-500">{accountSubtitle}</p>
            </div>
          </div>

          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <span>View profile</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void logout()}
            disabled={loggingOut}
          >
            <span>{loggingOut ? "Logging out..." : "Log out"}</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: Array<{
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    end?: boolean;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const isActive = items.some((item) => location.pathname.startsWith(item.to));

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
        <div className="absolute left-0 top-10 z-40 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{label}</h2>
            <p className="text-xs text-slate-500">Orders, prescriptions, reminders, and health</p>
          </div>

          <div className="py-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )
                  }
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-brand-700 ring-1 ring-slate-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
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
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
