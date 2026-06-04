import { useState } from "react";
import { LogOut, Menu, Pill, X } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/api";

const roleBadgeVariant: Record<Role, "info" | "warning" | "success" | "danger"> = {
  ROLE_USER: "info",
  ROLE_DOCTOR: "success",
  ROLE_PHARMACIST: "warning",
  ROLE_ADMIN: "danger",
};

const roleLabel: Record<Role, string> = {
  ROLE_USER: "Patient",
  ROLE_DOCTOR: "Doctor",
  ROLE_PHARMACIST: "Pharmacist",
  ROLE_ADMIN: "Administrator",
};

// Single source of truth for the nav, rendered both in the desktop bar and the
// mobile dropdown.
const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Products" },
  { to: "/categories", label: "Categories" },
  { to: "/interactions", label: "Interactions" },
  { to: "/pharmacies", label: "Pharmacies" },
  { to: "/orders", label: "Orders" },
  { to: "/prescriptions", label: "Prescriptions" },
  { to: "/reservations", label: "Reservations" },
  { to: "/health", label: "Health" },
  { to: "/profile", label: "Profile" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Pill className="h-6 w-6 text-brand-600" />
              PharmaFlow
            </NavLink>
            {/* Desktop nav — the full bar needs ~1400px, so it only appears at
                1440px+; narrower viewports get the hamburger (no overflow band). */}
            <nav className="hidden items-center gap-1 min-[1440px]:flex">
              {NAV_ITEMS.map((item) => (
                <NavTab key={item.to} to={item.to} end={item.end}>
                  {item.label}
                </NavTab>
              ))}
            </nav>
          </div>

          {/* Desktop user section */}
          <div className="hidden items-center gap-3 min-[1440px]:flex">
            {user && (
              <>
                <span className="max-w-[12rem] truncate text-sm text-slate-600">
                  {user.firstName
                    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                    : user.email}
                </span>
                {user.roles.map((r) => (
                  <Badge key={r} variant={roleBadgeVariant[r]}>
                    {roleLabel[r]}
                  </Badge>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void logout()}
                  aria-label="Log out"
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Log out
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 min-[1440px]:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown panel */}
        {menuOpen && (
          <div className="border-t border-slate-200 min-[1440px]:hidden">
            <nav className="flex w-full flex-col gap-1 px-6 py-3">
              {NAV_ITEMS.map((item) => (
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
              <div className="flex w-full flex-col gap-3 border-t border-slate-200 px-6 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">
                    {user.firstName
                      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                      : user.email}
                  </span>
                  {user.roles.map((r) => (
                    <Badge key={r} variant={roleBadgeVariant[r]}>
                      {roleLabel[r]}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  aria-label="Log out"
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Log out
                </Button>
              </div>
            )}
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Outlet />
      </main>
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
  children: React.ReactNode;
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
