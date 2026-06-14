import { Bell, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn, formatInstant } from "@/lib/utils";
import {
  canMarkNotificationRead,
  isUnreadNotification,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_VARIANTS,
  NOTIFICATION_TYPE_LABELS,
} from "@/notifications/notificationMeta";
import { NotificationTypeIcon } from "@/notifications/NotificationTypeIcon";
import { useNotifications } from "@/notifications/useNotifications";
import type { NotificationDTO } from "@/types/api";

const MAX_PANEL_ITEMS = 5;

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pendingReadId, setPendingReadId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleMarkAsRead = async (notification: NotificationDTO) => {
    if (!canMarkNotificationRead(notification.status) || notification.status === "READ") return;
    setPendingReadId(notification.id);
    try {
      await markAsRead(notification.id);
    } finally {
      setPendingReadId(null);
    }
  };

  const requestPermission = () => {
    void requestBrowserPermission();
  };

  const recentNotifications = notifications.slice(0, MAX_PANEL_ITEMS);

  return (
    <div ref={panelRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="relative h-9 w-9 rounded-2xl"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="dropdown-enter absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/12">
          <div className="flex items-center justify-between border-b border-slate-100 bg-brand-50/70 px-4 py-3">
            <div>
              <h2 className="text-sm font-extrabold text-ink-800">Notifications</h2>
              <p className="mt-1 text-xs text-slate-600">
                {unreadCount ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Refresh notifications"
              onClick={() => void refreshNotifications({ notifyOnError: true })}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="border-b border-slate-100 px-4 py-3">
            {browserPermission === "granted" && (
              <p className="text-xs text-slate-600">Browser alerts are enabled for this device.</p>
            )}
            {browserPermission === "default" && (
              <Button type="button" variant="outline" size="sm" onClick={requestPermission}>
                Enable browser alerts
              </Button>
            )}
            {browserPermission === "denied" && (
              <p className="text-xs text-amber-700">
                Browser alerts are blocked in your browser settings.
              </p>
            )}
            {browserPermission === "unsupported" && (
              <p className="text-xs text-slate-500">
                Browser alerts are not supported on this device.
              </p>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && !notifications.length && (
              <div className="space-y-3 p-4">
                <div className="h-12 animate-pulse rounded-md bg-slate-100" />
                <div className="h-12 animate-pulse rounded-md bg-slate-100" />
                <div className="h-12 animate-pulse rounded-md bg-slate-100" />
              </div>
            )}
            {!loading && !error && recentNotifications.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-extrabold text-ink-800">No notifications yet</p>
                <p className="mx-auto mt-1 max-w-56 text-xs leading-5 text-slate-500">
                  New account alerts will appear here after the next refresh.
                </p>
              </div>
            )}
            {recentNotifications.map((notification) => (
              <NotificationPanelItem
                key={notification.id}
                notification={notification}
                pendingRead={pendingReadId === notification.id}
                onMarkAsRead={() => void handleMarkAsRead(notification)}
              />
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-4 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            View all notifications
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function NotificationPanelItem({
  notification,
  pendingRead,
  onMarkAsRead,
}: {
  notification: NotificationDTO;
  pendingRead: boolean;
  onMarkAsRead: () => void;
}) {
  const unread = isUnreadNotification(notification.status);
  const canMarkRead =
    canMarkNotificationRead(notification.status) && notification.status !== "READ";

  return (
    <div
      className={cn(
        "flex gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0",
        unread ? "bg-brand-50/60" : "bg-white"
      )}
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-200">
        <NotificationTypeIcon type={notification.type} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium text-slate-900">
            {notification.title}
          </p>
          <Badge variant={NOTIFICATION_STATUS_VARIANTS[notification.status]}>
            {NOTIFICATION_STATUS_LABELS[notification.status]}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
          <span>{formatInstant(notification.createdAt)}</span>
          {canMarkRead && (
            <button
              type="button"
              className="font-medium text-brand-700 hover:text-brand-900 disabled:opacity-50"
              onClick={onMarkAsRead}
              disabled={pendingRead}
            >
              {pendingRead ? "Marking..." : "Mark read"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
