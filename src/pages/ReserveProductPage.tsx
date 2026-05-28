import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
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
      navigate(`/reservations?just=${reservation.id}`, { replace: true });
    },
    onError: (err) => setSubmitError(err),
  });

  const onSubmit = (values: FormValues) => {
    setSubmitError(null);
    mutation.mutate(values);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/products/${productIdNumeric}/availability`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to availability
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Reserve a product for pickup</CardTitle>
          <CardDescription>
            Creates a reservation in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">pharmacy-inventory-service</code>{" "}
            via <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">POST /api/reservations</code>. Expires in 24h.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {product.data && (
            <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{product.data.name}</p>
              <p className="text-slate-600">
                {product.data.price.toFixed(2)} KM · {product.data.manufacturer ?? "—"}
              </p>
            </div>
          )}

          {selectedPharmacy && (
            <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">{selectedPharmacy.name}</p>
              <p className="text-slate-600">
                {selectedPharmacy.address}, {selectedPharmacy.city} · {selectedPharmacy.openingHours}
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min={1} {...register("quantity", { valueAsNumber: true })} />
                {errors.quantity && <p className="text-xs text-red-600">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="productId">Product ID</Label>
                <Input id="productId" type="number" min={1} {...register("productId", { valueAsNumber: true })} />
                {errors.productId && <p className="text-xs text-red-600">{errors.productId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pharmacyId">Pharmacy ID</Label>
                <Input id="pharmacyId" type="number" min={1} {...register("pharmacyId", { valueAsNumber: true })} />
                {errors.pharmacyId && <p className="text-xs text-red-600">{errors.pharmacyId.message}</p>}
              </div>
            </div>

            <ErrorMessage error={submitError} />

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Reserving…" : "Reserve"}
              </Button>
              <Link
                to="/products"
                className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
