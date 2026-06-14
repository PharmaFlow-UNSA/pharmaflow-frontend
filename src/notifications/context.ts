import { createContext } from "react";
import type { NotificationDTO } from "@/types/api";

export type BrowserPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export interface NotificationState {
  notifications: NotificationDTO[];
  unreadCount: number;
  loading: boolean;
  error: unknown;
  browserPermission: BrowserPermissionState;
  refreshNotifications: (options?: { notifyOnError?: boolean }) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  requestBrowserPermission: () => Promise<BrowserPermissionState>;
}

export const NotificationCtx = createContext<NotificationState | undefined>(undefined);
