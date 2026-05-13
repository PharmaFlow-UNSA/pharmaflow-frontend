import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { Role } from "@/types/api";

interface Props {
  /** if set, user must have at least one of these roles */
  roles?: Role[];
}

export function ProtectedRoute({ roles }: Props) {
  const { user, hasRole } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
