import type { ToastOptions } from "./context";

let listener: ((toast: ToastOptions) => number) | null = null;

export function registerToastListener(nextListener: ((toast: ToastOptions) => number) | null) {
  listener = nextListener;
}

export function notify(toast: ToastOptions): number | null {
  return listener?.(toast) ?? null;
}
