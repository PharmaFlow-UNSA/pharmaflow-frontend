import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ToastCtx, type ToastContextValue, type ToastItem, type ToastOptions, type ToastVariant } from "./context";
import { registerToastListener } from "./toastBus";

const DEFAULT_DURATION_MS = 5200;

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-brand-200 bg-brand-50 text-ink-800",
};

const iconStyles: Record<ToastVariant, string> = {
  success: "text-emerald-600",
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-brand-600",
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastOptions) => {
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        title: toast.title,
        description: toast.description,
        variant: toast.variant ?? "info",
        durationMs: toast.durationMs ?? DEFAULT_DURATION_MS,
      };
      setToasts((current) => [item, ...current].slice(0, 5));
      if (item.durationMs > 0) {
        timers.current.set(id, window.setTimeout(() => dismiss(id), item.durationMs));
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    registerToastListener(notify);
    const currentTimers = timers.current;
    return () => {
      registerToastListener(null);
      currentTimers.forEach((timer) => window.clearTimeout(timer));
      currentTimers.clear();
    };
  }, [notify]);

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      dismiss,
      success: (description, title) => notify({ description, title, variant: "success" }),
      error: (description, title) => notify({ description, title, variant: "error" }),
      warning: (description, title) => notify({ description, title, variant: "warning" }),
      info: (description, title) => notify({ description, title, variant: "info" }),
    }),
    [dismiss, notify]
  );

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed right-4 top-20 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = icons[toast.variant];
  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto rounded-2xl border p-4 shadow-lg shadow-slate-900/10 backdrop-blur",
        variantStyles[toast.variant]
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconStyles[toast.variant])} />
        <div className="min-w-0 flex-1">
          {toast.title && <p className="font-semibold">{toast.title}</p>}
          <p className="text-sm leading-5">{toast.description}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-900"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
