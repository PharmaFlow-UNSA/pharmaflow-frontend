import { createContext } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  description: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastItem extends Required<Omit<ToastOptions, "title">> {
  id: number;
  title?: string;
}

export interface ToastContextValue {
  notify: (toast: ToastOptions) => number;
  dismiss: (id: number) => void;
  success: (description: string, title?: string) => number;
  error: (description: string, title?: string) => number;
  warning: (description: string, title?: string) => number;
  info: (description: string, title?: string) => number;
}

export const ToastCtx = createContext<ToastContextValue | null>(null);
