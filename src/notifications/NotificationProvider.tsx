import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationRead,
} from "@/api/notifications";
import { useAuth } from "@/auth/useAuth";
import { isUnreadNotification } from "@/notifications/notificationMeta";
import type { NotificationDTO } from "@/types/api";
import { NotificationCtx, type BrowserPermissionState } from "./context";

const VISIBLE_POLL_MS = 30_000;
const HIDDEN_POLL_MS = 120_000;

function getBrowserPermission(): BrowserPermissionState {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.userId;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [browserPermission, setBrowserPermission] =
    useState<BrowserPermissionState>(() => getBrowserPermission());
  const seenNotificationIds = useRef<Set<number>>(new Set());
  const hasLoadedForUser = useRef(false);

  const showBrowserNotification = useCallback(
    (notification: NotificationDTO) => {
      if (browserPermission !== "granted" || !("Notification" in window)) return;
      const nativeNotification = new Notification(notification.title, {
        body: notification.message,
        tag: `pharmaflow-notification-${notification.id}`,
      });
      nativeNotification.onclick = () => {
        window.focus();
        navigate("/notifications");
        nativeNotification.close();
      };
    },
    [browserPermission, navigate]
  );

  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      seenNotificationIds.current.clear();
      hasLoadedForUser.current = false;
      return;
    }

    setLoading((current) => current || !hasLoadedForUser.current);
    try {
      const nextNotifications = await getNotifications(userId);
      setError(null);

      const newlySeen = nextNotifications.filter(
        (notification) =>
          !seenNotificationIds.current.has(notification.id) &&
          isUnreadNotification(notification.status)
      );
      nextNotifications.forEach((notification) =>
        seenNotificationIds.current.add(notification.id)
      );

      if (hasLoadedForUser.current) {
        newlySeen.forEach(showBrowserNotification);
      }
      hasLoadedForUser.current = true;
      setNotifications(nextNotifications);
    } catch (refreshError) {
      setError(refreshError);
    } finally {
      setLoading(false);
    }
  }, [showBrowserNotification, userId]);

  const markAsRead = useCallback(async (id: number) => {
    const updated = await markNotificationRead(id);
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? updated : notification))
    );
  }, []);

  const requestBrowserPermission =
    useCallback(async (): Promise<BrowserPermissionState> => {
      if (!("Notification" in window)) {
        setBrowserPermission("unsupported");
        return "unsupported";
      }
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      return permission;
    }, []);

  useEffect(() => {
    seenNotificationIds.current.clear();
    hasLoadedForUser.current = false;
    const timeoutId = window.setTimeout(() => {
      void refreshNotifications();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshNotifications, userId]);

  useEffect(() => {
    if (!userId) return;

    let timeoutId: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timeoutId);
      const delay = document.hidden ? HIDDEN_POLL_MS : VISIBLE_POLL_MS;
      timeoutId = window.setTimeout(() => {
        void refreshNotifications().finally(scheduleRefresh);
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshNotifications();
      }
      scheduleRefresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleRefresh();

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshNotifications, userId]);

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => isUnreadNotification(notification.status)).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      browserPermission,
      refreshNotifications,
      markAsRead,
      requestBrowserPermission,
    }),
    [
      browserPermission,
      error,
      loading,
      markAsRead,
      notifications,
      refreshNotifications,
      requestBrowserPermission,
      unreadCount,
    ]
  );

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>;
}
