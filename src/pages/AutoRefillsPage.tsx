import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Plus, Repeat, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createAutoRefill,
  getAutoRefillsForUser,
  patchAutoRefillStatus,
} from "@/api/autoRefills";
import { getCurrentUser } from "@/api/users";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import {
  AUTO_REFILL_STATUS_LABELS,
  type AutoRefillStatus,
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
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);

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
    onError: (err) => toast.error(err),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AutoRefillStatus }) =>
      patchAutoRefillStatus(id, status),
    onSuccess: (_data, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["autoRefills"] });
      toast.success(`Subscription #${id} ${AUTO_REFILL_STATUS_LABELS[status].toLowerCase()}.`);
    },
    onError: (err) => toast.error(err),
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auto-refill subscriptions</h1>
          <p className="mt-1 text-slate-600">
            Pause, resume, or cancel ongoing therapy refills via{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              /api/auto-refill-subscriptions
            </code>
            .
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New subscription
        </Button>
      </div>

      {listQuery.isError && <ErrorMessage error={listQuery.error} />}
      {listQuery.isLoading && <p className="text-slate-500">Loading subscriptions…</p>}
      {statusMutation.isError && <ErrorMessage error={statusMutation.error} />}

      {listQuery.data && listQuery.data.length === 0 && (
        <p className="text-slate-600">No subscriptions yet. Create one to auto-order ongoing therapy.</p>
      )}

      {listQuery.data && listQuery.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {listQuery.data.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-700">
                    <Repeat className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Subscription #{s.id} · Product {s.productId}
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {s.dosagePerDay}/day · {s.tabletsPerPackage} per pack
                      {s.intervalDays != null ? ` · every ${s.intervalDays} days` : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[s.status]}>
                  {AUTO_REFILL_STATUS_LABELS[s.status]}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{s.shippingAddress}</p>
                {s.nextOrderDate && (
                  <p className="mt-1 text-xs text-slate-500">
                    Next auto-order: <strong>{s.nextOrderDate}</strong>
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  {s.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: s.id, status: "PAUSED" })
                      }
                    >
                      <Pause className="mr-1 h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  {s.status === "PAUSED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: s.id, status: "ACTIVE" })
                      }
                    >
                      <Play className="mr-1 h-4 w-4" />
                      Resume
                    </Button>
                  )}
                  {(s.status === "ACTIVE" || s.status === "PAUSED") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: s.id, status: "CANCELLED" })
                      }
                    >
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal ──────────────────────────────────────────────────── */}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="productId">Product ID</Label>
              <Input
                id="productId"
                type="number"
                min={1}
                {...form.register("productId", { valueAsNumber: true })}
              />
              {form.formState.errors.productId && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.productId.message}
                </p>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dosagePerDay">Tablets per day</Label>
              <Input
                id="dosagePerDay"
                type="number"
                min={1}
                {...form.register("dosagePerDay", { valueAsNumber: true })}
              />
              {form.formState.errors.dosagePerDay && (
                <p className="text-xs text-red-600">
                  {form.formState.errors.dosagePerDay.message}
                </p>
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
                <p className="text-xs text-red-600">
                  {form.formState.errors.tabletsPerPackage.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shippingAddress">Shipping address</Label>
            <Input
              id="shippingAddress"
              placeholder="Maršala Tita 25, Sarajevo"
              {...form.register("shippingAddress")}
            />
            {form.formState.errors.shippingAddress && (
              <p className="text-xs text-red-600">
                {form.formState.errors.shippingAddress.message}
              </p>
            )}
          </div>

          <ErrorMessage error={createMutation.error} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
