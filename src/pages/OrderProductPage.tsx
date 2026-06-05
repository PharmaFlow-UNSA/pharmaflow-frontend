import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { createOrder } from "@/api/orders";
import { getPrescriptions } from "@/api/prescriptions";
import { getProductById } from "@/api/products";
import { getCurrentUser } from "@/api/users";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

const orderFormSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(99),
  shippingAddress: z.string().min(5, "Enter a delivery address").max(255),
  paymentMethod: z.enum(["CARD", "CASH", "TRANSFER"]),
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
      paymentMethod: "CARD",
    },
  });

  const quantity = form.watch("quantity") || 0;
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
          method: values.paymentMethod,
          status: "PENDING",
        },
      });
    },
    onSuccess: (order) => {
      toast.success(`Order #${order.id} placed.`);
      navigate(`/orders/${order.id}`, { replace: true });
    },
    onError: (err) => toast.error(err),
  });

  const requiresRx = productQuery.data?.requiresPrescription === true;
  const approvedRxList = rxQuery.data?.content ?? [];
  const noApprovedRx = requiresRx && approvedRxList.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Place an order</CardTitle>
          <CardDescription>
            Creates an order via{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              POST /api/orders
            </code>{" "}
            with an item, payment, and shipping address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productQuery.isError && <ErrorMessage error={productQuery.error} />}
          {productQuery.isLoading && <p className="text-slate-500">Loading product…</p>}

          {productQuery.data && (
            <>
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{productQuery.data.name}</p>
                <p className="text-slate-600">
                  {productQuery.data.price.toFixed(2)} KM ·{" "}
                  {productQuery.data.manufacturer ?? "—"}
                  {requiresRx ? " · Rx required" : ""}
                </p>
              </div>

              {noApprovedRx && (
                <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
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
                className="space-y-4"
                onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
                noValidate
              >
                <div className="grid grid-cols-2 gap-3">
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
                    <Select id="paymentMethod" {...form.register("paymentMethod")}>
                      <option value="CARD">Card</option>
                      <option value="CASH">Cash on delivery</option>
                      <option value="TRANSFER">Bank transfer</option>
                    </Select>
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
                      <option value="">Select a prescription…</option>
                      {approvedRxList.map((rx) => (
                        <option key={rx.id} value={rx.id}>
                          #{rx.id} — uploaded {rx.uploadedAt ? String(rx.uploadedAt).slice(0, 10) : "?"}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Estimated total</span>
                    <span className="text-lg font-semibold text-slate-900">
                      {total.toFixed(2)} KM
                    </span>
                  </div>
                </div>

                <ErrorMessage error={mutation.error} />

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={mutation.isPending || (requiresRx && noApprovedRx)}
                  >
                    {mutation.isPending ? "Placing order…" : "Place order"}
                  </Button>
                  <Link
                    to="/products"
                    className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
