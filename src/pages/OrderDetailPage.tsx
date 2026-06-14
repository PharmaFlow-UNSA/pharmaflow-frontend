import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, FileText, MapPin, Package, SlidersHorizontal, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getDeliveriesByOrderId } from "@/api/deliveries";
import { getOrderById, patchOrderStatus } from "@/api/orders";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/toast/useToast";
import { formatInstant } from "@/lib/utils";
import {
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
  type OrderStatus,
} from "@/types/api";

const ORDER_STATUS_VARIANT: Record<OrderStatus, "info" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const DELIVERY_STATUS_VARIANT: Record<DeliveryStatus, "info" | "warning" | "success" | "danger"> = {
  PREPARING: "warning",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  FAILED: "danger",
  RETURNED: "warning",
};

const ORDER_NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const ORDER_ACTION: Record<
  OrderStatus,
  { label: string; variant: "default" | "outline" | "destructive" }
> = {
  PENDING: { label: "Reopen as pending", variant: "outline" },
  CONFIRMED: { label: "Confirm order", variant: "default" },
  SHIPPED: { label: "Mark as shipped", variant: "default" },
  DELIVERED: { label: "Mark as delivered", variant: "default" },
  CANCELLED: { label: "Cancel order", variant: "destructive" },
};

export function OrderDetailPage() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const toast = useToast();
  const isStaff = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrderById(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries", "order", id],
    queryFn: () => getDeliveriesByOrderId(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => patchOrderStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", id], updated);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Order #${updated.id} moved to ${updated.status.toLowerCase()}.`);
    },
    onError: () => {
      toast.error("Could not update the order status.");
    },
  });

  return (
    <div className="space-y-7 animate-section">
      {orderQuery.isError && <ErrorMessage error={orderQuery.error} />}
      {orderQuery.isLoading && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="h-80 skeleton-shimmer rounded-[2rem]" />
          <div className="h-80 skeleton-shimmer rounded-[2rem]" />
        </div>
      )}

      {orderQuery.data && (
        <>
          <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_88%_18%,rgba(34,197,94,0.22),transparent_24%),linear-gradient(135deg,#0f172a_0%,#172554_66%,#0f766e_100%)] p-7 text-white shadow-lg shadow-slate-900/10 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-100 ring-1 ring-white/15">
                  Order details
                </p>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Order #{orderQuery.data.id}
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-slate-200">
                  Placed by user {orderQuery.data.userId} · {formatInstant(orderQuery.data.createdAt)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-left ring-1 ring-white/15 lg:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-100">Total</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 lg:justify-end">
                  <span className="text-3xl font-extrabold">
                    {Number(orderQuery.data.totalAmount).toFixed(2)} KM
                  </span>
                  <Badge variant={ORDER_STATUS_VARIANT[orderQuery.data.status]}>
                    {orderQuery.data.status}
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Package className="h-4 w-4" />
                    </span>
                    Items ({orderQuery.data.orderItems?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Unit price</th>
                        <th className="pb-2 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderQuery.data.orderItems?.map((item) => (
                        <tr
                          key={item.id ?? `${item.productId}-${item.productName}`}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-3 font-medium text-slate-900">{item.productName}</td>
                          <td className="py-3 text-right text-slate-700">{item.quantity}</td>
                          <td className="py-3 text-right text-slate-700">
                            {Number(item.unitPrice).toFixed(2)} KM
                          </td>
                          <td className="py-3 text-right font-semibold text-slate-900">
                            {(Number(item.unitPrice) * item.quantity).toFixed(2)} KM
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                      <Truck className="h-4 w-4" />
                    </span>
                    Deliveries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deliveriesQuery.isLoading && (
                    <p className="text-sm text-slate-500">Loading deliveries…</p>
                  )}
                  {deliveriesQuery.data && deliveriesQuery.data.length === 0 && (
                    <p className="text-sm text-slate-600">No delivery has been scheduled yet.</p>
                  )}
                  {deliveriesQuery.data && deliveriesQuery.data.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {deliveriesQuery.data.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              Delivery #{d.id} · Pharmacy {d.pharmacyId}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              To {d.deliveryAddress} · ETA {formatInstant(d.estimatedDelivery)}
                              {d.actualDelivery && ` · delivered ${formatInstant(d.actualDelivery)}`}
                            </p>
                          </div>
                          <Badge variant={DELIVERY_STATUS_VARIANT[d.status]}>
                            {DELIVERY_STATUS_LABELS[d.status]}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              {isStaff && ORDER_NEXT_STATUSES[orderQuery.data.status].length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                        <SlidersHorizontal className="h-4 w-4" />
                      </span>
                      Update status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Current status
                      </span>
                      <Badge variant={ORDER_STATUS_VARIANT[orderQuery.data.status]}>
                        {orderQuery.data.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      {ORDER_NEXT_STATUSES[orderQuery.data.status].map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={ORDER_ACTION[next].variant}
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate(next)}
                        >
                          {ORDER_ACTION[next].label}
                        </Button>
                      ))}
                    </div>
                    {statusMutation.isError && (
                      <ErrorMessage error={statusMutation.error} className="mt-3" />
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <MapPin className="h-4 w-4" />
                    </span>
                    Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-slate-900">{orderQuery.data.shippingAddress}</p>
                </CardContent>
              </Card>

              {orderQuery.data.payment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Method</span>
                      <span className="font-medium">{orderQuery.data.payment.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status</span>
                      <span className="font-medium">{orderQuery.data.payment.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Amount</span>
                      <span className="font-medium">
                        {Number(orderQuery.data.payment.amount).toFixed(2)} KM
                      </span>
                    </div>
                    {orderQuery.data.payment.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Txn</span>
                        <span className="truncate font-mono text-xs">
                          {orderQuery.data.payment.transactionId}
                        </span>
                      </div>
                    )}
                    {orderQuery.data.payment.paidAt && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Paid</span>
                        <span className="text-xs">{formatInstant(orderQuery.data.payment.paidAt)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {orderQuery.data.prescriptionId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        <FileText className="h-4 w-4" />
                      </span>
                      Prescription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      to="/prescriptions"
                      className="text-sm text-brand-700 hover:underline"
                    >
                      Linked prescription #{orderQuery.data.prescriptionId}
                    </Link>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
