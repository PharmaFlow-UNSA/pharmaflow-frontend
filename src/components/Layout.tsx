import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  HeartPulse,
  LogOut,
  Pill,
  ReceiptText,
  UserCircle,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "@/auth/context";
import { useAuth } from "@/auth/useAuth";
import { FaqChatBubble } from "@/components/FaqChatBubble";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

export function Layout() {
  const { user, logout, loading, hasRole } = useAuth();
  const isAdmin = hasRole("ROLE_ADMIN");
  const location = useLocation();
  const navigate = useNavigate();
  const showBackButton = location.pathname !== "/";
  const showFaqChat = !isAdmin && !location.pathname.startsWith("/admin");

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Pill className="h-6 w-6 text-brand-600" />
              PharmaFlow
            </NavLink>
            <nav className="flex items-center gap-1">
              <NavTab to="/products">Products</NavTab>
              <NavTab to="/categories">Categories</NavTab>
              <NavTab to="/pharmacies">Pharmacies</NavTab>
              <NavTab to="/symptoms">Symptoms</NavTab>
              <NavDropdown
                label="My care"
                items={[
                  {
                    to: "/orders",
                    label: isAdmin ? "All orders" : "My orders",
                    icon: ReceiptText,
                  },
                  { to: "/prescriptions", label: "Prescriptions", icon: FileText },
                  { to: "/reservations", label: "Reservations", icon: ClipboardList },
                  { to: "/health", label: "Health", icon: HeartPulse },
                ]}
              />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <NotificationBell />
                <AccountMenu user={user} logout={logout} loggingOut={loading} />
              </>
            )}
          </div>
        </div>
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
            <p className="text-xs text-slate-500">Orders, prescriptions, reservations, and health</p>
          </div>

          <div className="py-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
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
}: {
  to: string;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
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
