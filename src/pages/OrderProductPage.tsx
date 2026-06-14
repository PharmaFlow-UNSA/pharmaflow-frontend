import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, PackageCheck, ShieldCheck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { createOrder } from "@/api/orders";
import { getPrescriptions } from "@/api/prescriptions";
import { getProductById } from "@/api/products";
import { getCurrentUser } from "@/api/users";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/toast/useToast";

const orderFormSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99),
  shippingAddress: z.string().min(5, "Enter a delivery address").max(255),
  prescriptionId: z.number().int().positive().optional(),
});
type OrderForm = z.infer<typeof orderFormSchema>;

/**
 * Single-product checkout. Reached via `/products/:productId/order` from a
 * product card. For products that require a prescription, the form asks for
 * an approved one from the patient's library.
 */
export function OrderProductPage() {
  const { productId: productIdParam } = useParams();
  const productId = Number(productIdParam);
  const navigate = useNavigate();
  const toast = useToast();

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    enabled: Number.isFinite(productId) && productId > 0,
  });

  const userQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  // Approved prescriptions belonging to the current user — only loaded when
  // the product needs one.
  const rxQuery = useQuery({
    queryKey: ["prescriptions", "approved", userQuery.data?.id],
    queryFn: () =>
      getPrescriptions({
        userId: userQuery.data?.id,
        status: "APPROVED",
        size: 20,
        sort: "uploadedAt,desc",
      }),
    enabled: !!userQuery.data?.id && productQuery.data?.requiresPrescription === true,
  });

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      quantity: 1,
      shippingAddress: "",
    },
  });

  const watchedQuantity = useWatch({ control: form.control, name: "quantity" });
  const quantity = watchedQuantity || 0;
  const unitPrice = productQuery.data?.price ?? 0;
  const total = quantity * unitPrice;

  const mutation = useMutation({
    mutationFn: async (values: OrderForm) => {
      if (!userQuery.data?.id || !productQuery.data) {
        throw new Error("Missing user or product");
      }
      return createOrder({
        userId: userQuery.data.id,
        shippingAddress: values.shippingAddress,
        prescriptionId: values.prescriptionId,
        orderItems: [
          {
            productId: productQuery.data.id,
            productName: productQuery.data.name,
            quantity: values.quantity,
            unitPrice: productQuery.data.price,
          },
        ],
        payment: {
          amount: values.quantity * productQuery.data.price,
          method: "CASH",
          status: "PENDING",
        },
      });
    },
    onSuccess: (order) => {
      toast.success(`Order #${order.id} was placed.`);
      navigate(`/orders/${order.id}`, { replace: true });
    },
    onError: () => {
      toast.error("Could not place the order.");
    },
  });

  const requiresRx = productQuery.data?.requiresPrescription === true;
  const approvedRxList = rxQuery.data?.content ?? [];
  const noApprovedRx = requiresRx && approvedRxList.length === 0;

  return (
    <div className="space-y-8 animate-section">
      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_82%_18%,rgba(34,197,94,0.22),transparent_24%),linear-gradient(135deg,#0f172a_0%,#172554_64%,#0f766e_100%)] p-7 text-white shadow-lg shadow-slate-900/10 lg:p-9">
        <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-100 ring-1 ring-white/15">
          Checkout
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Review and place your order
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-200">
          Confirm product details, prescription requirements, pickup payment, and shipping address.
        </p>
      </section>

      {productQuery.isError && <ErrorMessage error={productQuery.error} />}
      {productQuery.isLoading && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="h-96 skeleton-shimmer rounded-[1.75rem]" />
          <div className="h-72 skeleton-shimmer rounded-[1.75rem]" />
        </div>
      )}

      {productQuery.data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70">
              <CardTitle>Order details</CardTitle>
              <CardDescription>Complete the required fields to create the order.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {noApprovedRx && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    This product requires an approved prescription. You don't have one yet.{" "}
                    <Link to="/prescriptions" className="font-medium underline">
                      Upload one
                    </Link>{" "}
                    and wait for review.
                  </div>
                </div>
              )}

              <form
                className="space-y-5"
                onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={99}
                      {...form.register("quantity", { valueAsNumber: true })}
                    />
                    {form.formState.errors.quantity && (
                      <p className="text-xs text-red-600">
                        {form.formState.errors.quantity.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="paymentMethod">Payment method</Label>
                    <div
                      id="paymentMethod"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Payment on pickup
                    </div>
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

                {requiresRx && approvedRxList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="prescriptionId">Approved prescription</Label>
                    <Select
                      id="prescriptionId"
                      {...form.register("prescriptionId", { valueAsNumber: true })}
                      defaultValue=""
                    >
                      <option value="">Select a prescription...</option>
                      {approvedRxList.map((rx) => (
                        <option key={rx.id} value={rx.id}>
                          #{rx.id} - uploaded {rx.uploadedAt ? String(rx.uploadedAt).slice(0, 10) : "?"}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <ErrorMessage error={mutation.error} />

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={mutation.isPending || (requiresRx && noApprovedRx)}
                  >
                    {mutation.isPending ? "Placing order..." : "Place order"}
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
                <CardTitle>Order summary</CardTitle>
                <CardDescription>Single-product checkout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-slate-900">{productQuery.data.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {productQuery.data.manufacturer ?? "Manufacturer not set"}
                    {requiresRx ? " · Rx required" : ""}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Unit price</span>
                    <span className="font-semibold text-slate-900">
                      {productQuery.data.price.toFixed(2)} KM
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Quantity</span>
                    <span className="font-semibold text-slate-900">{quantity || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-4 text-white">
                  <span className="text-sm text-slate-200">Estimated total</span>
                  <span className="text-2xl font-extrabold">{total.toFixed(2)} KM</span>
                </div>

                <div className="grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-brand-600" />
                    Order uses the existing PharmaFlow order flow.
                  </div>
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-brand-600" />
                    Payment is collected when the order is picked up.
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-600" />
                    Prescription requirements stay visible before submission.
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
