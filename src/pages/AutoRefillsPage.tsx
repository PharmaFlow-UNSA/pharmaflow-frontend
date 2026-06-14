import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  MapPin,
  PackageCheck,
  Pause,
  Pill,
  Play,
  Plus,
  Repeat,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import {
  createAutoRefill,
  getAutoRefillsForUser,
  patchAutoRefillStatus,
} from "@/api/autoRefills";
import { getProductById } from "@/api/products";
import { getCurrentUser } from "@/api/users";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/toast/useToast";
import {
  AUTO_REFILL_STATUS_LABELS,
  type AutoRefillStatus,
  type AutoRefillSubscriptionDTO,
  type ProductDTO,
} from "@/types/api";

const STATUS_VARIANT: Record<AutoRefillStatus, "info" | "warning" | "success" | "danger"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  CANCELLED: "danger",
  COMPLETED: "info",
};

const createSchema = z.object({
  productId: z.number().int().positive("Product ID is required"),
  dosagePerDay: z.number().int().min(1, "At least 1 per day").max(20),
  tabletsPerPackage: z.number().int().min(1, "At least 1 per pack").max(500),
  shippingAddress: z.string().min(5, "Required").max(255),
  prescriptionId: z.number().int().positive().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export function AutoRefillsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const toast = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const userId = currentUser?.id;

  const listQuery = useQuery({
    queryKey: ["autoRefills", "user", userId],
    queryFn: () => getAutoRefillsForUser(userId!),
    enabled: !!userId,
  });

  const subscriptions = listQuery.data ?? [];
  const productIds = useMemo(
    () => Array.from(new Set(subscriptions.map((subscription) => subscription.productId))),
    [subscriptions]
  );
  const productQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ["product", "auto-refill", productId],
      queryFn: () => getProductById(productId),
      staleTime: 60_000,
      retry: 1,
    })),
  });
  const productsById = useMemo(() => {
    const products = new Map<number, ProductDTO>();
    productQueries.forEach((query, index) => {
      if (query.data) products.set(productIds[index], query.data);
    });
    return products;
  }, [productIds, productQueries]);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { dosagePerDay: 1, tabletsPerPackage: 30 },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) => {
      if (!userId) throw new Error("Not authenticated");
      return createAutoRefill({
        userId,
        productId: values.productId,
        dosagePerDay: values.dosagePerDay,
        tabletsPerPackage: values.tabletsPerPackage,
        shippingAddress: values.shippingAddress,
        prescriptionId: values.prescriptionId,
        status: "ACTIVE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoRefills"] });
      setCreateOpen(false);
      form.reset({ dosagePerDay: 1, tabletsPerPackage: 30 });
      toast.success("Auto-refill subscription created.");
    },
    onError: () => {
      toast.error("Could not create the auto-refill subscription.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AutoRefillStatus }) =>
      patchAutoRefillStatus(id, status),
    onSuccess: (_updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["autoRefills"] });
      toast.success(`Subscription ${AUTO_REFILL_STATUS_LABELS[variables.status].toLowerCase()}.`);
    },
    onError: () => {
      toast.error("Could not update the auto-refill subscription.");
    },
  });

  const stats = subscriptionStats(subscriptions);

  return (
    <div className="space-y-6 animate-section">
      <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_85%_16%,rgba(45,212,191,0.34),transparent_26%),linear-gradient(135deg,#0f172a_0%,#164e63_52%,#0f766e_100%)] px-7 py-8 text-white shadow-lg shadow-slate-900/10">
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-100">
              <Repeat className="h-4 w-4" />
              Recurring care
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Auto-refills</h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-200">
              Manage recurring refills for eligible therapy products.
            </p>
          </div>
          <Button
            type="button"
            className="w-full rounded-2xl bg-white text-brand-700 hover:bg-brand-50 sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New subscription
          </Button>
        </div>
      </section>

      {subscriptions.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Active" value={stats.active} tone="text-emerald-700" />
          <SummaryStat label="Paused" value={stats.paused} tone="text-amber-700" />
          <SummaryStat label="Cancelled" value={stats.cancelled} tone="text-red-700" />
          <SummaryStat label="Next refill" value={stats.nextRefill ?? "Not scheduled"} tone="text-brand-700" />
        </section>
      )}

      {listQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-100 bg-red-50/80 p-5">
          <ErrorMessage error={listQuery.error} />
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              listQuery.refetch().catch(() => {
                toast.error("Could not reload auto-refills.");
              });
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {statusMutation.isError && <ErrorMessage error={statusMutation.error} />}

      {listQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SubscriptionSkeleton key={index} />
          ))}
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && subscriptions.length === 0 && (
        <EmptyAutoRefills onCreate={() => setCreateOpen(true)} />
      )}

      {subscriptions.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              product={productsById.get(subscription.productId)}
              busy={statusMutation.isPending}
              onStatus={(status) => {
                if (status === "CANCELLED") {
                  const confirmed = window.confirm(
                    "Cancel this auto-refill subscription? You can create a new subscription later if needed."
                  );
                  if (!confirmed) return;
                }
                statusMutation.mutate({ id: subscription.id, status });
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New auto-refill"
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
          noValidate
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                type="number"
                min={1}
                {...form.register("productId", { valueAsNumber: true })}
              />
              {form.formState.errors.productId && (
                <p className="text-xs text-red-600">{form.formState.errors.productId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prescriptionId">Prescription ID (optional)</Label>
              <Input
                id="prescriptionId"
                type="number"
                min={1}
                {...form.register("prescriptionId", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dosagePerDay">Tablets per day</Label>
              <Input
                id="dosagePerDay"
                type="number"
                min={1}
                {...form.register("dosagePerDay", { valueAsNumber: true })}
              />
              {form.formState.errors.dosagePerDay && (
                <p className="text-xs text-red-600">{form.formState.errors.dosagePerDay.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tabletsPerPackage">Tablets per package</Label>
              <Input
                id="tabletsPerPackage"
                type="number"
                min={1}
                {...form.register("tabletsPerPackage", { valueAsNumber: true })}
              />
              {form.formState.errors.tabletsPerPackage && (
                <p className="text-xs text-red-600">{form.formState.errors.tabletsPerPackage.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shippingAddress">Delivery address</Label>
            <Input
              id="shippingAddress"
              placeholder="Marsala Tita 25, Sarajevo"
              {...form.register("shippingAddress")}
            />
            {form.formState.errors.shippingAddress && (
              <p className="text-xs text-red-600">{form.formState.errors.shippingAddress.message}</p>
            )}
          </div>

          <ErrorMessage error={createMutation.error} />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create subscription"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SubscriptionCard({
  subscription,
  product,
  busy,
  onStatus,
}: {
  subscription: AutoRefillSubscriptionDTO;
  product?: ProductDTO;
  busy: boolean;
  onStatus: (status: AutoRefillStatus) => void;
}) {
  const productName = product?.name ?? `Product #${subscription.productId}`;
  const packSize = product?.packageSize ?? `${subscription.tabletsPerPackage} tablets per pack`;

  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Repeat className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Subscription #{subscription.id}
            </p>
            <h2 className="mt-1 line-clamp-2 text-lg font-extrabold leading-6 text-ink-800">
              {productName}
            </h2>
            {product?.brandName && (
              <p className="mt-1 text-sm text-slate-500">{product.brandName}</p>
            )}
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[subscription.status]} className="shrink-0">
          {AUTO_REFILL_STATUS_LABELS[subscription.status]}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <MetadataRow
          icon={Pill}
          label="Dosage"
          value={`${subscription.dosagePerDay} per day`}
        />
        <MetadataRow icon={PackageCheck} label="Pack size" value={packSize} />
        <MetadataRow
          icon={CalendarClock}
          label="Refill interval"
          value={subscription.intervalDays ? `Every ${subscription.intervalDays} days` : "Calculated after setup"}
        />
        <MetadataRow
          icon={CheckCircle2}
          label="Next auto-order"
          value={formatDate(subscription.nextOrderDate) ?? "Not scheduled"}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
        <div className="flex gap-2 text-sm text-slate-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <span className="line-clamp-2">{subscription.shippingAddress}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row sm:flex-wrap">
        {subscription.status === "ACTIVE" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onStatus("PAUSED")}
          >
            <Pause className="mr-1 h-4 w-4" />
            Pause
          </Button>
        )}
        {subscription.status === "PAUSED" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onStatus("ACTIVE")}
          >
            <Play className="mr-1 h-4 w-4" />
            Resume
          </Button>
        )}
        {(subscription.status === "ACTIVE" || subscription.status === "PAUSED") && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={busy}
            onClick={() => onStatus("CANCELLED")}
          >
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
}

function MetadataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function EmptyAutoRefills({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-brand-200 bg-brand-50/60 px-5 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
        <Repeat className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-ink-800">No auto-refills yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Set up recurring refills for eligible products you use regularly.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Button type="button" onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New subscription
        </Button>
        <Link
          to="/products"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl skeleton-shimmer" />
        <div className="flex-1">
          <div className="h-3 w-28 rounded skeleton-shimmer" />
          <div className="mt-2 h-6 w-2/3 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      <div className="mt-4 h-14 rounded-2xl skeleton-shimmer" />
    </div>
  );
}

function subscriptionStats(subscriptions: AutoRefillSubscriptionDTO[]) {
  const nextDates = subscriptions
    .filter((subscription) => subscription.status === "ACTIVE" && subscription.nextOrderDate)
    .map((subscription) => subscription.nextOrderDate!)
    .sort();

  return {
    active: subscriptions.filter((subscription) => subscription.status === "ACTIVE").length,
    paused: subscriptions.filter((subscription) => subscription.status === "PAUSED").length,
    cancelled: subscriptions.filter((subscription) => subscription.status === "CANCELLED").length,
    nextRefill: formatDate(nextDates[0]),
  };
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
