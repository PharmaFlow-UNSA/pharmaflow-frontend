import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { ToastCtx, type ToastApi, type ToastType } from "./Toast";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => remove(id), AUTO_DISMISS_MS);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (error, fallback) => push("error", getApiErrorMessage(error, fallback)),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={remove} />
    </ToastCtx.Provider>
  );
}

const TYPE_STYLES: Record<
  ToastType,
  { className: string; Icon: ComponentType<{ className?: string }> }
> = {
  success: { className: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  error: { className: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
  info: { className: "border-brand-200 bg-brand-50 text-brand-700", Icon: Info },
};

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const { className, Icon } = TYPE_STYLES[t.type];
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-md border px-4 py-3 text-sm shadow-lg",
              className
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
