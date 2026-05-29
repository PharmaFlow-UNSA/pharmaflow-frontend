import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { getInventoryForProduct, getPharmacies } from "@/api/pharmacies";
import { reserveRecommendation } from "@/api/recommendations";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toBackendLocalDateTime, toLocalDateTimeInputValue } from "@/lib/utils";
import type {
  ProductDTO,
  RecommendationDTO,
  RecommendationReservationSagaDTO,
} from "@/types/api";
import { SAGA_STATUS_LABELS } from "./recommendationMeta";

const reserveSchema = z.object({
  pharmacyId: z
    .number({ error: "Pharmacy is required" })
    .int("Select a valid pharmacy")
    .positive("Select a valid pharmacy"),
  quantity: z
    .number({ error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be positive"),
  expiresAt: z
    .string()
    .min(1, "Expiry is required")
    .refine((value) => new Date(value).getTime() > Date.now(), "Expiry must be in the future"),
});

type ReserveForm = z.infer<typeof reserveSchema>;

interface Props {
  recommendation: RecommendationDTO | null;
  product?: ProductDTO;
  open: boolean;
  onClose: () => void;
}

export function RecommendationReserveModal({
  recommendation,
  product,
  open,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [saga, setSaga] = useState<RecommendationReservationSagaDTO | null>(null);
  const [defaultExpiresAt] = useState(() =>
    toLocalDateTimeInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const productId = recommendation?.productId;

  const inventoryQuery = useQuery({
    queryKey: ["inventory", "product", productId],
    queryFn: () => getInventoryForProduct(productId ?? 0),
    enabled: open && Boolean(productId),
  });

  const pharmaciesQuery = useQuery({
    queryKey: ["pharmacies", { size: 50 }],
    queryFn: () => getPharmacies({ size: 50 }),
    enabled: open,
  });

  const availableInventory = useMemo(
    () => (inventoryQuery.data ?? []).filter((item) => item.quantity > 0),
    [inventoryQuery.data]
  );

  const pharmaciesById = useMemo(
    () => new Map(pharmaciesQuery.data?.content.map((pharmacy) => [pharmacy.id, pharmacy]) ?? []),
    [pharmaciesQuery.data]
  );

  const form = useForm<ReserveForm>({
    resolver: zodResolver(reserveSchema),
    values: {
      pharmacyId: availableInventory[0]?.pharmacyId ?? 0,
      quantity: 1,
      expiresAt: defaultExpiresAt,
    },
  });

  const selectedPharmacyId = useWatch({ control: form.control, name: "pharmacyId" });
  const selectedInventory = availableInventory.find(
    (item) => item.pharmacyId === Number(selectedPharmacyId)
  );

  const mutation = useMutation({
    mutationFn: (values: ReserveForm) => {
      if (!recommendation) throw new Error("Recommendation is required.");
      return reserveRecommendation(recommendation.id, {
        pharmacyId: values.pharmacyId,
        quantity: values.quantity,
        expiresAt: toBackendLocalDateTime(values.expiresAt),
      });
    },
    onSuccess: (result) => {
      setSaga(result);
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["recommendation-interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  const close = () => {
    setSaga(null);
    mutation.reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Reserve recommendation" className="max-w-lg">
      {!recommendation ? null : (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">
              {product?.name ?? `Product #${recommendation.productId}`}
            </p>
            <p className="mt-1 text-slate-600">
              This request starts a reservation workflow. Confirmation may complete asynchronously.
            </p>
          </div>

          {inventoryQuery.isError && <ErrorMessage error={inventoryQuery.error} />}
          {pharmaciesQuery.isError && <ErrorMessage error={pharmaciesQuery.error} />}

          {(inventoryQuery.isLoading || pharmaciesQuery.isLoading) && (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          )}

          {!inventoryQuery.isLoading && availableInventory.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No pharmacy currently has stock for this product.
            </p>
          )}

          {availableInventory.length > 0 && (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
              noValidate
            >
              {mutation.isError && <ErrorMessage error={mutation.error} />}

              <div className="space-y-1.5">
                <Label htmlFor="recommendationPharmacy">Pharmacy</Label>
                <Select
                  id="recommendationPharmacy"
                  {...form.register("pharmacyId", { valueAsNumber: true })}
                  disabled={mutation.isPending}
                >
                  {availableInventory.map((item) => {
                    const pharmacy = pharmaciesById.get(item.pharmacyId);
                    return (
                      <option key={item.id} value={item.pharmacyId}>
                        {pharmacy?.name ?? `Pharmacy #${item.pharmacyId}`} ({item.quantity} in stock)
                      </option>
                    );
                  })}
                </Select>
                {form.formState.errors.pharmacyId && (
                  <p className="text-xs text-red-700">{form.formState.errors.pharmacyId.message}</p>
                )}
              </div>

              {selectedInventory && (
                <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
                  <p>
                    Available stock: <span className="font-medium text-slate-900">{selectedInventory.quantity}</span>
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="recommendationQuantity">Quantity</Label>
                  <Input
                    id="recommendationQuantity"
                    type="number"
                    min="1"
                    max={selectedInventory?.quantity}
                    {...form.register("quantity", {
                      valueAsNumber: true,
                      validate: (value) =>
                        !selectedInventory || value <= selectedInventory.quantity || "Quantity exceeds available stock",
                    })}
                    disabled={mutation.isPending}
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-xs text-red-700">{form.formState.errors.quantity.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recommendationExpires">Expires at</Label>
                  <Input
                    id="recommendationExpires"
                    type="datetime-local"
                    {...form.register("expiresAt")}
                    disabled={mutation.isPending}
                  />
                  {form.formState.errors.expiresAt && (
                    <p className="text-xs text-red-700">{form.formState.errors.expiresAt.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Requesting..." : "Request reservation"}
                </Button>
                <Button type="button" variant="outline" onClick={close}>
                  Close
                </Button>
              </div>
            </form>
          )}

          {saga && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Reservation workflow started</p>
                <Badge variant="success">{SAGA_STATUS_LABELS[saga.status]}</Badge>
              </div>
              <p className="mt-1">Correlation id: {saga.correlationId}</p>
              <p className="mt-1">Fulfillment is pending and may complete asynchronously.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
