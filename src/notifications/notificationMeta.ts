import type {
  NotificationStatus,
  NotificationTriggerSource,
  NotificationType,
} from "@/types/api";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "THERAPY_REMINDER",
  "REFILL_ALERT",
  "RECALL_ALERT",
  "CHAT",
  "SYSTEM",
];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  THERAPY_REMINDER: "Therapy reminder",
  REFILL_ALERT: "Refill alert",
  RECALL_ALERT: "Recall alert",
  CHAT: "Chat",
  SYSTEM: "System",
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read",
  FAILED: "Failed",
};

export const NOTIFICATION_TRIGGER_LABELS: Record<NotificationTriggerSource, string> = {
  THERAPY: "Therapy",
  RECALL: "Recall",
  AUTO_REFILL: "Auto refill",
  CHATBOT: "Chatbot",
  FRAUD: "Fraud",
  SYSTEM: "System",
};

export const NOTIFICATION_STATUS_VARIANTS: Record<
  NotificationStatus,
  "default" | "outline" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  SENT: "info",
  DELIVERED: "success",
  READ: "outline",
  FAILED: "danger",
};

export function isUnreadNotification(status: NotificationStatus): boolean {
  return status !== "READ" && status !== "FAILED";
}

export function canMarkNotificationRead(status: NotificationStatus): boolean {
  return status === "DELIVERED" || status === "READ";
}
