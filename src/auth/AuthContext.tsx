import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  type LoginPayload,
  type RegisterPayload,
} from "@/api/auth";
import { setOnAuthLost, tokenStorage } from "@/api/client";
import type { AuthResponse, Role } from "@/types/api";
import { AuthCtx, type AuthState, type AuthUser } from "./context";

interface JwtPayload {
  sub: string;
  roles: Role[];
  userId?: number;
  firstName?: string;
  lastName?: string;
  iat: number;
  exp: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromAuthResponse(resp: AuthResponse): AuthUser {
  return {
    email: resp.email,
    firstName: resp.firstName,
    lastName: resp.lastName,
    roles: resp.roles,
  };
}

function userFromStoredToken(): AuthUser | null {
  const token = tokenStorage.getAccess();
  if (!token) return null;
  const claims = decodeJwt(token);
  if (!claims) return null;
  if (claims.exp * 1000 < Date.now()) {
    tokenStorage.clear();
    return null;
  }
  return {
    email: claims.sub,
    roles: claims.roles ?? [],
    firstName: claims.firstName,
    lastName: claims.lastName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => userFromStoredToken());
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  // Wire the axios interceptor's "auth lost" callback to React routing.
  useEffect(() => {
    setOnAuthLost(() => {
      setUser(null);
      navigate("/login", { replace: true });
    });
    return () => setOnAuthLost(null);
  }, [navigate]);

  const login = useCallback(async (p: LoginPayload): Promise<void> => {
    setLoading(true);
    try {
      const resp = await loginApi(p);
      setUser(userFromAuthResponse(resp));
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (p: RegisterPayload): Promise<void> => {
    setLoading(true);
    try {
      const resp = await registerApi(p);
      setUser(userFromAuthResponse(resp));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]): boolean => {
      if (!user) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user]
  );

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, hasRole }),
    [user, loading, login, register, logout, hasRole]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
