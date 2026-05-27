import axios from "axios";
import { api, GATEWAY_URL, tokenStorage } from "./client";
import type { AuthResponse, ChangePasswordPayload, Role } from "@/types/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: Role;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  // Bare axios — no interceptor → no auto-refresh loop if creds are wrong.
  const { data } = await axios.post<AuthResponse>(
    `${GATEWAY_URL}/api/auth/login`,
    payload
  );
  tokenStorage.set(data.accessToken, data.refreshToken);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await axios.post<AuthResponse>(
    `${GATEWAY_URL}/api/auth/register`,
    payload
  );
  tokenStorage.set(data.accessToken, data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefresh();
  try {
    // Use the authenticated `api` instance — the gateway needs to see the
    // access token in order to blacklist it.
    await api.post("/api/auth/logout", { refreshToken });
  } catch {
    // Server-side errors don't matter — we still wipe local state.
  } finally {
    tokenStorage.clear();
  }
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.post("/api/auth/change-password", payload);
}
