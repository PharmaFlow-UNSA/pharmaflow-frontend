import { createContext } from "react";
import type { LoginPayload, RegisterPayload } from "@/api/auth";
import type { Role } from "@/types/api";

export interface AuthUser {
  userId?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (p: LoginPayload) => Promise<AuthUser>;
  register: (p: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthCtx = createContext<AuthState | undefined>(undefined);
