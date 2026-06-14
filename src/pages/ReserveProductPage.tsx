import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, MapPin, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { getPharmacies } from "@/api/pharmacies";
import { getProductById } from "@/api/products";
import { createReservation } from "@/api/reservations";
import { getCurrentUser } from "@/api/users";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatPrice, getProductImage } from "@/lib/catalog";
import { useToast } from "@/toast/useToast";

const reservationFormSchema = z.object({
  productId: z.number().int().positive("Product id is required"),
  pharmacyId: z.number().int().positive("Pharmacy id is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

type FormValues = z.infer<typeof reservationFormSchema>;

/**
 * Reservation form. Reached from ProductAvailabilityPage via a per-pharmacy
 * "Reserve here" button that deep-links with productId in the path and
 * pharmacyId in the query string, so the form arrives pre-populated. The
 * authenticated user id is read from /api/users/me, not entered manually.
 */
export function ReserveProductPage() {
  const { productId: productIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const pharmacyIdParam = searchParams.get("pharmacyId");
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const toast = useToast();

  const productIdNumeric = Number(productIdParam);
  const pharmacyIdNumeric = pharmacyIdParam ? Number(pharmacyIdParam) : NaN;

  const currentUser = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const product = useQuery({
    queryKey: ["product", productIdNumeric],
    queryFn: () => getProductById(productIdNumeric),
    enabled: Number.isFinite(productIdNumeric) && productIdNumeric > 0,
  });

  const pharmacies = useQuery({
    queryKey: ["pharmacies", { size: 50 }],
    queryFn: () => getPharmacies({ size: 50 }),
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      productId: Number.isFinite(productIdNumeric) ? productIdNumeric : 1,
      pharmacyId: Number.isFinite(pharmacyIdNumeric) ? pharmacyIdNumeric : 1,
      quantity: 1,
    },
  });

  // Re-sync form when URL params change (rare, but handles direct navigation).
  useEffect(() => {
    if (Number.isFinite(productIdNumeric)) {
      setValue("productId", productIdNumeric);
    }
    if (Number.isFinite(pharmacyIdNumeric)) {
      setValue("pharmacyId", pharmacyIdNumeric);
    }
  }, [productIdNumeric, pharmacyIdNumeric, setValue]);

  const selectedPharmacyId = useWatch({ control, name: "pharmacyId" });
  const selectedPharmacy = pharmacies.data?.content.find((p) => p.id === Number(selectedPharmacyId));

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!currentUser.data?.id) throw new Error("Not authenticated");
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
      return createReservation({
        ...values,
        userId: currentUser.data.id,
        status: "PENDING",
        // backend expects LocalDateTime; trim the trailing "Z"
        reservedAt: now.toISOString().slice(0, 19),
        expiresAt: expires.toISOString().slice(0, 19),
      });
    },
    onSuccess: (reservation) => {
      toast.success(`Reservation #${reservation.id} was created.`);
      navigate(`/reservations?just=${reservation.id}`, { replace: true });
    },
    onError: (err) => setSubmitError(err),
  });

  const onSubmit = (values: FormValues) => {
    setSubmitError(null);
    mutation.mutate(values);
  };

  return (
    <div className="space-y-8 animate-section">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-brand-100 bg-[radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] p-7 shadow-sm sm:flex-row sm:items-end sm:justify-between lg:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Pickup reservation</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink-800">
            Reserve a product for pickup
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Hold this item at your selected pharmacy for 24 hours, then pick it up when it suits you.
          </p>
        </div>
      </section>

      {(product.isError || pharmacies.isError || currentUser.isError) && (
        <div className="space-y-3">
          {product.isError && <ErrorMessage error={product.error} />}
          {pharmacies.isError && <ErrorMessage error={pharmacies.error} />}
          {currentUser.isError && <ErrorMessage error={currentUser.error} />}
        </div>
      )}

      {(product.isLoading || pharmacies.isLoading) && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="h-80 skeleton-shimmer rounded-[1.75rem]" />
          <div className="h-72 skeleton-shimmer rounded-[1.75rem]" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70">
            <CardTitle>Reservation details</CardTitle>
            <CardDescription>Confirm the quantity before creating your pickup hold.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <input type="hidden" {...register("productId", { valueAsNumber: true })} />
              <input type="hidden" {...register("pharmacyId", { valueAsNumber: true })} />

              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  className="h-12 rounded-xl shadow-sm"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && <p className="text-xs text-red-600">{errors.quantity.message}</p>}
              </div>

              {(errors.productId || errors.pharmacyId) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  This reservation link is missing product or pharmacy details.
                </div>
              )}

              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <PackageCheck className="h-4 w-4 text-brand-600" />
                  Pickup hold
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Clock className="h-4 w-4 text-brand-600" />
                  Expires in 24h
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  Selected pharmacy
                </div>
              </div>

              <ErrorMessage error={submitError} />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" disabled={mutation.isPending || currentUser.isLoading}>
                  {mutation.isPending ? "Reserving..." : "Reserve pickup"}
                </Button>
                <Link
                  to="/products"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="lg:sticky lg:top-24">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-brand-50/70">
              <CardTitle>Pickup summary</CardTitle>
              <CardDescription>Your selected product and location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {product.data && (
                <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                    <img
                      src={getProductImage(product.data)}
                      alt={product.data.name}
                      className="max-h-16 max-w-16 object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{product.data.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.data.manufacturer ?? "Manufacturer not set"}
                    </p>
                    <p className="mt-3 text-lg font-extrabold text-red-600">
                      {formatPrice(product.data.price)}
                    </p>
                  </div>
                </div>
              )}

              {selectedPharmacy && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">{selectedPharmacy.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedPharmacy.address}, {selectedPharmacy.city}
                  </p>
                  {selectedPharmacy.openingHours && (
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Hours: {selectedPharmacy.openingHours}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white">
                <p className="text-sm text-slate-200">Reservation window</p>
                <p className="mt-1 text-2xl font-extrabold">24 hours</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
