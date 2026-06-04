import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getNotificationTriggers } from "@/api/notifications";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn, formatInstant } from "@/lib/utils";
import {
  canMarkNotificationRead,
  isUnreadNotification,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_VARIANTS,
  NOTIFICATION_TRIGGER_LABELS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPES,
} from "@/notifications/notificationMeta";
import { NotificationTypeIcon } from "@/notifications/NotificationTypeIcon";
import { useNotifications } from "@/notifications/useNotifications";
import type {
  NotificationDTO,
  NotificationTriggerDTO,
  NotificationType,
} from "@/types/api";

type StatusFilter = "ALL" | "UNREAD" | "READ" | "FAILED";
type TypeFilter = "ALL" | NotificationType;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "READ", label: "Read" },
  { value: "FAILED", label: "Failed" },
];

export function NotificationsPage() {
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [selected, setSelected] = useState<NotificationDTO | null>(null);
  const [triggers, setTriggers] = useState<NotificationTriggerDTO[]>([]);
  const [triggerError, setTriggerError] = useState<unknown>(null);
  const [triggersLoading, setTriggersLoading] = useState(false);
  const [pendingReadId, setPendingReadId] = useState<number | null>(null);

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "UNREAD" && isUnreadNotification(notification.status)) ||
          notification.status === statusFilter;
        const matchesType = typeFilter === "ALL" || notification.type === typeFilter;
        return matchesStatus && matchesType;
      }),
    [notifications, statusFilter, typeFilter]
  );

  const openDetails = async (notification: NotificationDTO) => {
    setSelected(notification);
    setTriggers([]);
    setTriggerError(null);
    setTriggersLoading(true);
    try {
      setTriggers(await getNotificationTriggers(notification.id));
    } catch (nextError) {
      setTriggerError(nextError);
    } finally {
      setTriggersLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: NotificationDTO) => {
    if (!canMarkNotificationRead(notification.status) || notification.status === "READ") return;
    setPendingReadId(notification.id);
    try {
      await markAsRead(notification.id);
      setSelected((current) =>
        current?.id === notification.id ? { ...current, status: "READ" } : current
      );
    } finally {
      setPendingReadId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="mt-1 text-slate-600">
            Review account alerts from reminders, refills, recalls, chat, and system events.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshNotifications()}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Refresh
        </Button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {unreadCount ? `${unreadCount} unread notifications` : "No unread notifications"}
            </p>
            <p className="text-sm text-slate-500">
              Browser alerts work while PharmaFlow is open in this browser.
            </p>
          </div>
          {browserPermission === "default" && (
            <Button type="button" size="sm" onClick={() => void requestBrowserPermission()}>
              Enable browser alerts
            </Button>
          )}
          {browserPermission === "granted" && <Badge variant="success">Browser alerts enabled</Badge>}
          {browserPermission === "denied" && <Badge variant="warning">Browser alerts blocked</Badge>}
          {browserPermission === "unsupported" && (
            <Badge variant="outline">Browser alerts unsupported</Badge>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
          {STATUS_FILTERS.map((filter) => (
            <FilterButton
              key={filter.value}
              active={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </FilterButton>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <FilterButton active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")}>
            All types
          </FilterButton>
          {NOTIFICATION_TYPES.map((type) => (
            <FilterButton
              key={type}
              active={typeFilter === type}
              onClick={() => setTypeFilter(type)}
            >
              {NOTIFICATION_TYPE_LABELS[type]}
            </FilterButton>
          ))}
        </div>
      </section>

      {error ? <ErrorMessage error={error} /> : null}
      {loading && notifications.length === 0 && (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
        </div>
      )}
      {!loading && filteredNotifications.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-900">No notifications match these filters.</p>
          <p className="mt-1 text-sm text-slate-500">
            New account alerts will appear here when the backend creates them.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            pendingRead={pendingReadId === notification.id}
            onOpen={() => void openDetails(notification)}
            onMarkAsRead={() => void handleMarkAsRead(notification)}
          />
        ))}
      </div>

      <NotificationDetailsModal
        notification={selected}
        triggers={triggers}
        triggerError={triggerError}
        triggersLoading={triggersLoading}
        pendingRead={selected ? pendingReadId === selected.id : false}
        onClose={() => setSelected(null)}
        onMarkAsRead={() => {
          if (selected) void handleMarkAsRead(selected);
        }}
      />
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}

function NotificationRow({
  notification,
  pendingRead,
  onOpen,
  onMarkAsRead,
}: {
  notification: NotificationDTO;
  pendingRead: boolean;
  onOpen: () => void;
  onMarkAsRead: () => void;
}) {
  const unread = isUnreadNotification(notification.status);
  const canMarkRead =
    canMarkNotificationRead(notification.status) && notification.status !== "READ";

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-start",
        unread && "border-brand-200 bg-brand-50/40"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-brand-700 ring-1 ring-slate-200">
        <NotificationTypeIcon type={notification.type} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-slate-900">{notification.title}</h2>
          <Badge variant={NOTIFICATION_STATUS_VARIANTS[notification.status]}>
            {NOTIFICATION_STATUS_LABELS[notification.status]}
          </Badge>
          {unread && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
        </div>
        <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>{NOTIFICATION_TYPE_LABELS[notification.type]}</span>
          <span>{notification.channel}</span>
          <span>{formatInstant(notification.createdAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onOpen}>
          Details
        </Button>
        {canMarkRead && (
          <Button
            type="button"
            size="sm"
            onClick={onMarkAsRead}
            disabled={pendingRead}
          >
            {pendingRead ? "Marking..." : "Mark read"}
          </Button>
        )}
      </div>
    </article>
  );
}

function NotificationDetailsModal({
  notification,
  triggers,
  triggerError,
  triggersLoading,
  pendingRead,
  onClose,
  onMarkAsRead,
}: {
  notification: NotificationDTO | null;
  triggers: NotificationTriggerDTO[];
  triggerError: unknown;
  triggersLoading: boolean;
  pendingRead: boolean;
  onClose: () => void;
  onMarkAsRead: () => void;
}) {
  if (!notification) return null;

  const canMarkRead =
    canMarkNotificationRead(notification.status) && notification.status !== "READ";

  return (
    <Modal open={Boolean(notification)} onClose={onClose} title="Notification details">
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{notification.title}</h3>
            <Badge variant={NOTIFICATION_STATUS_VARIANTS[notification.status]}>
              {NOTIFICATION_STATUS_LABELS[notification.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-700">{notification.message}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <DetailTerm label="Type" value={NOTIFICATION_TYPE_LABELS[notification.type]} />
          <DetailTerm label="Channel" value={notification.channel} />
          <DetailTerm label="Created" value={formatInstant(notification.createdAt)} />
          <DetailTerm label="Sent" value={formatInstant(notification.sentAt)} />
          <DetailTerm label="Read" value={formatInstant(notification.readAt)} />
          <DetailTerm
            label="Patient profile"
            value={notification.patientProfileId?.toString() ?? "—"}
          />
        </dl>

        <div>
          <h4 className="text-sm font-semibold text-slate-900">Triggers</h4>
          {triggersLoading && <p className="mt-2 text-sm text-slate-500">Loading triggers...</p>}
          {triggerError ? <ErrorMessage error={triggerError} className="mt-2" /> : null}
          {!triggersLoading && !triggerError && triggers.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">No trigger details available.</p>
          )}
          {triggers.length > 0 && (
            <div className="mt-2 space-y-2">
              {triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-800">
                    {NOTIFICATION_TRIGGER_LABELS[trigger.triggerSource]}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatInstant(trigger.triggeredAt)}
                    {trigger.sourceEntityId ? ` · source #${trigger.sourceEntityId}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {canMarkRead && (
            <Button type="button" onClick={onMarkAsRead} disabled={pendingRead}>
              {pendingRead ? "Marking..." : "Mark read"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-800">{value}</dd>
    </div>
  );
}
