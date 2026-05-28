import { LogOut, Pill } from "lucide-react";
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

export function Layout() {
  const { user, logout } = useAuth();
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
              <NavTab to="/" end>Home</NavTab>
              <NavTab to="/products">Products</NavTab>
              <NavTab to="/categories">Categories</NavTab>
              <NavTab to="/interactions">Interactions</NavTab>
              <NavTab to="/orders">My orders</NavTab>
              <NavTab to="/reservations">Reservations</NavTab>
              <NavTab to="/health">Health</NavTab>
              <NavTab to="/profile">Profile</NavTab>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
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
        </div>
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
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
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
