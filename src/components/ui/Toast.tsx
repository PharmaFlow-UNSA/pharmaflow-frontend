import { createContext, useContext } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastApi {
  /** Confirmation that a user action succeeded. */
  success: (message: string) => void;
  /** Surface an error. Accepts a raw thrown value (Axios/Query) or a string. */
  error: (error: unknown, fallback?: string) => void;
  info: (message: string) => void;
}

export const ToastCtx = createContext<ToastApi | undefined>(undefined);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
