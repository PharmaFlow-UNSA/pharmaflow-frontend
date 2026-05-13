import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * Single Axios instance pointed at the API Gateway (NOT the individual services).
 * VITE_GATEWAY_URL overrides the default for non-localhost setups.
 */
export const GATEWAY_URL: string =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? "http://localhost:8080";

// ── localStorage helpers ─────────────────────────────────────────────────────

const ACCESS_KEY = "pharmaflow.accessToken";
const REFRESH_KEY = "pharmaflow.refreshToken";

export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  set: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  setAccess: (accessToken: string): void => {
    localStorage.setItem(ACCESS_KEY, accessToken);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Axios instance ───────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach Authorization header on every outbound request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── 401 → refresh → retry, all-other-failures pass through ───────────────────

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;
let onAuthLost: (() => void) | null = null;

/** Registered by AuthProvider so the interceptor can boot the user to /login. */
export function setOnAuthLost(fn: (() => void) | null): void {
  onAuthLost = fn;
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) return null;

  try {
    // Use a bare axios call so this request itself does NOT trigger the
    // interceptor (no Authorization header, no recursive refresh).
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
    }>(`${GATEWAY_URL}/api/auth/refresh`, { refreshToken });
    tokenStorage.set(data.accessToken, data.refreshToken ?? refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    // Only attempt refresh on 401 from a *protected* call (we have a refresh
    // token, the request hasn't already been retried, and it's not the auth
    // endpoint itself — those should not auto-refresh).
    const isAuthEndpoint = original?.url?.includes("/api/auth/");
    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      refreshInFlight ??= tryRefresh().finally(() => {
        refreshInFlight = null;
      });
      const newToken = await refreshInFlight;
      if (newToken) {
        if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      // Refresh failed → wipe tokens and let the app redirect to login.
      tokenStorage.clear();
      onAuthLost?.();
    }

    return Promise.reject(error);
  }
);
