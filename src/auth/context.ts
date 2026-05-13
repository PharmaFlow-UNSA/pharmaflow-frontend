import { createContext } from "react";
import type { LoginPayload, RegisterPayload } from "@/api/auth";
import type { Role } from "@/types/api";

export interface AuthUser {
  email: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (p: LoginPayload) => Promise<void>;
  register: (p: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthCtx = createContext<AuthState | undefined>(undefined);
