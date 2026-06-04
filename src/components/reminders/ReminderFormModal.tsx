import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlarmClock, Pill, Search, Users } from "lucide-react";
import { getProducts } from "@/api/products";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { ProductDTO, TherapyReminderDTO, TherapyReminderPayload } from "@/types/api";

export interface ReminderTargetOption {
  patientProfileId: number;
  label: string;
  helper?: string;
}

export interface ReminderFormDefaults {
  targetProfileId?: number;
  product?: ProductDTO | null;
  productSearch?: string;
  dosageInstruction?: string;
  frequencyPerDay?: number;
  startDate?: string;
  endDate?: string | null;
}

const reminderSchema = z
  .object({
    patientProfileId: z.coerce.number().positive("Choose who this reminder is for"),
    dosageInstruction: z.string().max(255, "Max 255 characters").optional().or(z.literal("")),
    frequencyPerDay: z.coerce
      .number()
      .int("Use a whole number")
      .min(1, "Minimum 1 per day")
      .max(24, "Maximum 24 per day"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().or(z.literal("")),
  })
  .refine(
    (value) => !value.endDate || value.endDate >= value.startDate,
    { message: "End date must be after start date", path: ["endDate"] }
  );

type ReminderFormValues = z.infer<typeof reminderSchema>;
type ReminderFormInput = z.input<typeof reminderSchema>;

interface ReminderFormModalProps {
  open: boolean;
  title: string;
  targets: ReminderTargetOption[];
  initialReminder?: TherapyReminderDTO | null;
  initialProduct?: ProductDTO | null;
  defaults?: ReminderFormDefaults | null;
  isPending?: boolean;
  error?: unknown;
  onClose: () => void;
  onSubmit: (payload: TherapyReminderPayload) => void;
}

export function ReminderFormModal({
  open,
  title,
  targets,
  initialReminder,
  initialProduct,
  defaults,
  isPending = false,
  error,
  onClose,
  onSubmit,
}: ReminderFormModalProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialTargetProfileId =
    defaults?.targetProfileId ?? initialReminder?.patientProfileId ?? targets[0]?.patientProfileId;
  const initialSelectedProduct = defaults?.product ?? initialProduct ?? null;
  const initialProductSearch =
    defaults?.productSearch ?? initialProduct?.name ?? defaults?.product?.name ?? "";
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(initialSelectedProduct);
  const [productSearch, setProductSearch] = useState(initialProductSearch);
  const [productTouched, setProductTouched] = useState(false);
  const deferredProductSearch = useDeferredValue(productSearch.trim());

  const form = useForm<ReminderFormInput, unknown, ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      patientProfileId: initialTargetProfileId ?? 0,
      dosageInstruction:
        defaults?.dosageInstruction ?? initialReminder?.dosageInstruction ?? "",
      frequencyPerDay: defaults?.frequencyPerDay ?? initialReminder?.frequencyPerDay ?? 1,
      startDate: defaults?.startDate ?? initialReminder?.startDate ?? today,
      endDate: defaults?.endDate ?? initialReminder?.endDate ?? "",
    },
  });
  const watchedPatientProfileId = useWatch({
    control: form.control,
    name: "patientProfileId",
  });

  const productQuery = useQuery({
    queryKey: ["products", "reminderSearch", deferredProductSearch],
    queryFn: () =>
      getProducts({
        name: deferredProductSearch,
        page: 0,
        size: 8,
        sort: "name,asc",
      }),
    enabled: open && !selectedProduct && deferredProductSearch.length >= 2,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });

  const productOptions = productQuery.data?.content ?? [];
  const existingProductId = initialReminder?.productId;
  const selectedProductId = selectedProduct?.id ?? (productTouched ? undefined : existingProductId);

  function handleSubmit(values: ReminderFormValues) {
    if (!selectedProductId) {
      setProductTouched(true);
      return;
    }

    onSubmit({
      patientProfileId: values.patientProfileId,
      productId: selectedProductId,
      dosageInstruction: values.dosageInstruction?.trim() || null,
      frequencyPerDay: values.frequencyPerDay,
      startDate: values.startDate,
      endDate: values.endDate || null,
    });
  }

  const selectedTarget = targets.find(
    (target) => target.patientProfileId === Number(watchedPatientProfileId)
  );

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-2xl">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reminder-target">Target profile *</Label>
            <Select
              id="reminder-target"
              disabled={isPending || targets.length === 0}
              variant={form.formState.errors.patientProfileId ? "error" : "default"}
              {...form.register("patientProfileId")}
            >
              {targets.map((target) => (
                <option key={target.patientProfileId} value={target.patientProfileId}>
                  {target.label}
                </option>
              ))}
            </Select>
            {selectedTarget?.helper && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users className="h-3 w-3" />
                {selectedTarget.helper}
              </p>
            )}
            {form.formState.errors.patientProfileId && (
              <p className="text-xs text-red-500">
                {String(form.formState.errors.patientProfileId.message)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="frequencyPerDay">Frequency per day *</Label>
            <Input
              id="frequencyPerDay"
              type="number"
              min={1}
              max={24}
              disabled={isPending}
              {...form.register("frequencyPerDay")}
              aria-invalid={!!form.formState.errors.frequencyPerDay}
            />
            {form.formState.errors.frequencyPerDay && (
              <p className="text-xs text-red-500">
                {String(form.formState.errors.frequencyPerDay.message)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-search">Product *</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="product-search"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setProductTouched(true);
                setSelectedProduct(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !selectedProductId) {
                  event.preventDefault();
                  setProductTouched(true);
                }
              }}
              disabled={isPending}
              placeholder="Search product catalog"
              className="pl-9"
            />

            {!selectedProduct &&
              deferredProductSearch.length >= 2 &&
              (productQuery.isLoading || productOptions.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {productQuery.isLoading && productOptions.length === 0 ? (
                    <div className="space-y-2 p-2">
                      {[0, 1].map((item) => (
                        <div key={item} className="h-12 animate-pulse rounded-md bg-slate-100" />
                      ))}
                    </div>
                  ) : (
                    productOptions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedProduct(product);
                          setProductSearch(product.name);
                          setProductTouched(false);
                        }}
                      >
                        <Pill className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{product.name}</span>
                          <span className="block text-sm text-slate-500">
                            {[product.brandName, product.manufacturer, product.packageSize]
                              .filter(Boolean)
                              .join(" · ") || "Catalog product"}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
          </div>

          {selectedProduct ? (
            <div className="flex items-start gap-3 rounded-md border border-brand-100 bg-brand-50 p-3">
              <Pill className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{selectedProduct.name}</p>
                <p className="text-sm text-slate-500">
                  {[
                    selectedProduct.brandName,
                    selectedProduct.manufacturer,
                    selectedProduct.packageSize,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Selected catalog product"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  setSelectedProduct(null);
                  setProductSearch("");
                  setProductTouched(true);
                }}
              >
                Change
              </Button>
            </div>
          ) : null}

          {productTouched &&
            deferredProductSearch.length >= 2 &&
            !productQuery.isLoading &&
            productOptions.length === 0 && (
              <p className="text-sm text-slate-500">No products found.</p>
            )}
          {productQuery.isError && (
            <p className="text-xs text-red-500">
              Product search failed. Try again or choose a different search term.
            </p>
          )}
          {productTouched && !selectedProductId && (
            <p className="text-xs text-red-500">Select a product from the catalog.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dosageInstruction">Dosage instruction</Label>
          <textarea
            id="dosageInstruction"
            rows={3}
            disabled={isPending}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. Take one tablet with water"
            {...form.register("dosageInstruction")}
            aria-invalid={!!form.formState.errors.dosageInstruction}
          />
          {form.formState.errors.dosageInstruction && (
            <p className="text-xs text-red-500">
              {String(form.formState.errors.dosageInstruction.message)}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date *</Label>
            <Input
              id="startDate"
              type="date"
              disabled={isPending}
              {...form.register("startDate")}
              aria-invalid={!!form.formState.errors.startDate}
            />
            {form.formState.errors.startDate && (
              <p className="text-xs text-red-500">
                {String(form.formState.errors.startDate.message)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              type="date"
              disabled={isPending}
              {...form.register("endDate")}
              aria-invalid={!!form.formState.errors.endDate}
            />
            {form.formState.errors.endDate && (
              <p className="text-xs text-red-500">
                {String(form.formState.errors.endDate.message)}
              </p>
            )}
          </div>
        </div>

        {Boolean(error) && <ErrorMessage error={error} />}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" disabled={isPending || targets.length === 0}>
            <AlarmClock className="mr-1.5 h-4 w-4" />
            {isPending ? "Saving..." : initialReminder ? "Update reminder" : "Add reminder"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
