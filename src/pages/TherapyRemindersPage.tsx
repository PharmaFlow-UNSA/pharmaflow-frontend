import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PauseCircle,
  Pencil,
  Pill,
  PlayCircle,
  Plus,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { getFamilyMembersByUserId } from "@/api/health";
import {
  createTherapyReminder,
  deleteTherapyReminder,
  getTherapyReminders,
  updateTherapyReminder,
  updateTherapyReminderStatus,
} from "@/api/notifications";
import { getProductById } from "@/api/products";
import { getCurrentUser } from "@/api/users";
import {
  ReminderFormModal,
  type ReminderTargetOption,
} from "@/components/reminders/ReminderFormModal";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn, formatInstant, parseInstant } from "@/lib/utils";
import type {
  ProductDTO,
  TherapyReminderDTO,
  TherapyReminderPayload,
  TherapyReminderStatus,
} from "@/types/api";

const STATUS_LABELS: Record<TherapyReminderStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

const STATUS_VARIANTS: Record<
  TherapyReminderStatus,
  "default" | "outline" | "success" | "warning" | "danger" | "info"
> = {
  ACTIVE: "success",
  PAUSED: "warning",
  COMPLETED: "outline",
  CANCELED: "danger",
};

const STATUS_ICONS = {
  ACTIVE: Clock3,
  PAUSED: PauseCircle,
  COMPLETED: CheckCircle2,
  CANCELED: XCircle,
} satisfies Record<TherapyReminderStatus, typeof Clock3>;

const EMPTY_REMINDERS: TherapyReminderDTO[] = [];

export function TherapyRemindersPage() {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<number | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<TherapyReminderDTO | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const currentUser = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const familyMembersQuery = useQuery({
    queryKey: ["familyMembers", currentUser.data?.id],
    queryFn: () => getFamilyMembersByUserId(currentUser.data!.id),
    enabled: Boolean(currentUser.data?.id),
  });

  const targets = useMemo<ReminderTargetOption[]>(() => {
    const options: ReminderTargetOption[] = [];
    if (currentUser.data?.patientProfile?.id) {
      options.push({
        patientProfileId: currentUser.data.patientProfile.id,
        label: "Me",
        helper: `${currentUser.data.firstName} ${currentUser.data.lastName}`,
      });
    }
    for (const member of familyMembersQuery.data ?? []) {
      if (!member.patientProfile?.id) continue;
      options.push({
        patientProfileId: member.patientProfile.id,
        label: member.firstName,
        helper: member.relationship.replaceAll("_", " ").toLowerCase(),
      });
    }
    return options;
  }, [currentUser.data, familyMembersQuery.data]);

  const targetNameByProfileId = useMemo(() => {
    return new Map(targets.map((target) => [target.patientProfileId, target.label]));
  }, [targets]);

  const remindersQuery = useQuery({
    queryKey: ["therapyReminders"],
    queryFn: () => getTherapyReminders(),
    enabled: currentUser.isSuccess,
  });

  const reminders = remindersQuery.data ?? EMPTY_REMINDERS;
  const visibleReminders =
    selectedProfileId === "all"
      ? reminders
      : reminders.filter((reminder) => reminder.patientProfileId === selectedProfileId);

  const uniqueProductIds = useMemo(
    () => Array.from(new Set(reminders.map((reminder) => reminder.productId))),
    [reminders]
  );

  const productQueries = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: ["product", productId],
      queryFn: () => getProductById(productId),
      enabled: remindersQuery.isSuccess,
      staleTime: 60_000,
    })),
  });

  const productsById = new Map<number, ProductDTO>();
  const productLoadingById = new Map<number, boolean>();
  const productErrorById = new Map<number, boolean>();
  productQueries.forEach((query, index) => {
    const productId = uniqueProductIds[index];
    if (query.data) productsById.set(productId, query.data);
    productLoadingById.set(productId, query.isLoading);
    productErrorById.set(productId, query.isError);
  });

  const createReminder = useMutation({
    mutationFn: createTherapyReminder,
    onSuccess: () => {
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ["therapyReminders"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const updateReminder = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TherapyReminderPayload }) =>
      updateTherapyReminder(id, payload),
    onSuccess: () => {
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ["therapyReminders"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "PAUSED" }) =>
      updateTherapyReminderStatus(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["therapyReminders"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: deleteTherapyReminder,
    onSuccess: () => {
      setDeleteConfirmId(null);
      void queryClient.invalidateQueries({ queryKey: ["therapyReminders"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const activeCount = reminders.filter((reminder) => reminder.status === "ACTIVE").length;
  const pausedCount = reminders.filter((reminder) => reminder.status === "PAUSED").length;
  const completedCount = reminders.filter((reminder) => reminder.status === "COMPLETED").length;
  const nextReminder = findNextReminder(reminders);

  function closeModal() {
    setShowModal(false);
    setEditingReminder(null);
    createReminder.reset();
    updateReminder.reset();
  }

  function submitReminder(payload: TherapyReminderPayload) {
    if (editingReminder) {
      updateReminder.mutate({ id: editingReminder.id, payload });
    } else {
      createReminder.mutate(payload);
    }
  }

  if (currentUser.isLoading) {
    return <PageSkeleton />;
  }

  if (currentUser.isError) {
    return <ErrorMessage error={currentUser.error} />;
  }

  if (targets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader onAdd={undefined} />
        <EmptyState
          title="Health profile required"
          description="Create your health profile, or add a family member with a health profile, before reminders can be managed."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader onAdd={() => setShowModal(true)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Active" value={String(activeCount)} icon={AlarmClock} />
        <SummaryCard label="Paused" value={String(pausedCount)} icon={PauseCircle} />
        <SummaryCard label="Completed" value={String(completedCount)} icon={CheckCircle2} />
        <SummaryCard
          label="Next reminder"
          value={nextReminder ? formatInstant(nextReminder.nextReminderAt) : "None scheduled"}
          icon={Clock3}
          compact
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterButton
          active={selectedProfileId === "all"}
          label="All"
          onClick={() => setSelectedProfileId("all")}
        />
        {targets.map((target) => (
          <FilterButton
            key={target.patientProfileId}
            active={selectedProfileId === target.patientProfileId}
            label={target.label}
            onClick={() => setSelectedProfileId(target.patientProfileId)}
          />
        ))}
      </div>

      {familyMembersQuery.isSuccess &&
        (familyMembersQuery.data ?? []).length > 0 &&
        !familyMembersQuery.data?.some((member) => member.patientProfile?.id) && (
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            <Users className="h-4 w-4 text-slate-400" />
            No family members with health profiles yet.
          </div>
        )}

      {remindersQuery.isError && <ErrorMessage error={remindersQuery.error} />}
      {remindersQuery.isLoading && <ReminderListSkeleton />}

      {!remindersQuery.isLoading && !remindersQuery.isError && visibleReminders.length === 0 && (
        <EmptyState
          title="No reminders for this profile"
          description="Add a therapy reminder to schedule medication notifications."
        />
      )}

      {!remindersQuery.isLoading && !remindersQuery.isError && visibleReminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4" />
              Reminder schedule
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {visibleReminders.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {visibleReminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  targetName={targetNameByProfileId.get(reminder.patientProfileId) ?? "Family"}
                  product={productsById.get(reminder.productId)}
                  productLoading={productLoadingById.get(reminder.productId) ?? false}
                  productError={productErrorById.get(reminder.productId) ?? false}
                  deleteConfirmId={deleteConfirmId}
                  actionPending={
                    updateStatus.isPending || deleteReminder.isPending || updateReminder.isPending
                  }
                  onEdit={() => {
                    setEditingReminder(reminder);
                    setShowModal(true);
                  }}
                  onToggleStatus={() =>
                    updateStatus.mutate({
                      id: reminder.id,
                      status: reminder.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                    })
                  }
                  onDeleteAsk={() => setDeleteConfirmId(reminder.id)}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                  onDeleteConfirm={() => deleteReminder.mutate(reminder.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <ReminderFormModal
          open={showModal}
          title={editingReminder ? "Edit reminder" : "Add reminder"}
          targets={targets}
          initialReminder={editingReminder}
          initialProduct={editingReminder ? productsById.get(editingReminder.productId) : null}
          defaults={
            editingReminder
              ? null
              : {
                  targetProfileId:
                    selectedProfileId === "all" ? targets[0]?.patientProfileId : selectedProfileId,
                }
          }
          isPending={createReminder.isPending || updateReminder.isPending}
          error={createReminder.error ?? updateReminder.error}
          onClose={closeModal}
          onSubmit={submitReminder}
        />
      )}
    </div>
  );
}

function PageHeader({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <AlarmClock className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-semibold text-slate-900">Therapy reminders</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Manage medication reminders for yourself and family members.
        </p>
      </div>
      {onAdd && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add reminder
        </Button>
      )}
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className="shrink-0"
    >
      {label}
    </Button>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  compact = false,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className="h-4 w-4 text-brand-600" />
      </div>
      <p
        className={cn(
          "mt-2 font-semibold text-slate-900",
          compact ? "text-sm leading-snug" : "text-2xl"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ReminderRow({
  reminder,
  targetName,
  product,
  productLoading,
  productError,
  deleteConfirmId,
  actionPending,
  onEdit,
  onToggleStatus,
  onDeleteAsk,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  reminder: TherapyReminderDTO;
  targetName: string;
  product?: ProductDTO;
  productLoading: boolean;
  productError: boolean;
  deleteConfirmId: number | null;
  actionPending: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDeleteAsk: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const StatusIcon = STATUS_ICONS[reminder.status];
  const productMeta = [product?.brandName, product?.manufacturer, product?.packageSize]
    .filter(Boolean)
    .join(" · ");
  const canToggle = reminder.status === "ACTIVE" || reminder.status === "PAUSED";

  return (
    <article className="flex flex-col gap-4 py-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Pill className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            {productLoading ? (
              <div className="h-5 w-48 max-w-full animate-pulse rounded bg-slate-100" />
            ) : product ? (
              <Link
                to={`/products/${product.id}`}
                className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
              >
                {product.name}
              </Link>
            ) : (
              <p className="font-medium text-slate-900">
                {productError ? "Product details unavailable" : "Medication unavailable"}
              </p>
            )}
            {productLoading ? (
              <div className="mt-2 h-4 w-56 max-w-full animate-pulse rounded bg-slate-100" />
            ) : (
              productMeta && <p className="mt-0.5 text-sm text-slate-500">{productMeta}</p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {targetName}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {reminder.dosageInstruction?.trim() || "No dosage instruction provided."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[28rem]">
        <DetailItem icon={Clock3} label="Frequency" value={`${reminder.frequencyPerDay} per day`} />
        <DetailItem icon={CalendarDays} label="Starts" value={formatLocalDate(reminder.startDate)} />
        <DetailItem icon={CalendarDays} label="Ends" value={formatLocalDate(reminder.endDate)} />
        <DetailItem icon={Clock3} label="Next" value={formatInstant(reminder.nextReminderAt)} />
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Badge variant={STATUS_VARIANTS[reminder.status]} className="gap-1.5">
            <StatusIcon className="h-3 w-3" />
            {STATUS_LABELS[reminder.status]}
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              disabled={actionPending}
              aria-label="Edit reminder"
              title="Edit reminder"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {canToggle && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleStatus}
                disabled={actionPending}
                aria-label={reminder.status === "ACTIVE" ? "Pause reminder" : "Resume reminder"}
                title={reminder.status === "ACTIVE" ? "Pause reminder" : "Resume reminder"}
              >
                {reminder.status === "ACTIVE" ? (
                  <PauseCircle className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
              </Button>
            )}
            {deleteConfirmId === reminder.id ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={actionPending}
                  onClick={onDeleteConfirm}
                >
                  Confirm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actionPending}
                  onClick={onDeleteCancel}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDeleteAsk}
                disabled={actionPending}
                aria-label="Delete reminder"
                title="Delete reminder"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="break-words font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <AlarmClock className="h-5 w-5" />
      </div>
      <p className="mt-4 font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
      <ReminderListSkeleton />
    </div>
  );
}

function ReminderListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-44 animate-pulse rounded bg-slate-100" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function findNextReminder(reminders: TherapyReminderDTO[]): TherapyReminderDTO | null {
  const now = Date.now();
  return (
    reminders
      .filter((reminder) => reminder.status === "ACTIVE")
      .map((reminder) => ({ reminder, date: parseInstant(reminder.nextReminderAt) }))
      .filter(({ date }) => date && date.getTime() >= now)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime())[0]?.reminder ?? null
  );
}

function formatLocalDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}
