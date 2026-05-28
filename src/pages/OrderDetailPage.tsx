import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Package, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getDeliveriesByOrderId } from "@/api/deliveries";
import { getOrderById } from "@/api/orders";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
  PENDING: "warning",
  DISPATCHED: "info",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  FAILED: "danger",
};

export function OrderDetailPage() {
  const { orderId } = useParams();
  const id = Number(orderId);

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

  return (
    <div>
      <Link
        to="/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      {orderQuery.isError && <ErrorMessage error={orderQuery.error} />}
      {orderQuery.isLoading && <p className="text-slate-500">Loading order…</p>}

      {orderQuery.data && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Order #{orderQuery.data.id}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Placed by user {orderQuery.data.userId} · {formatInstant(orderQuery.data.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold text-slate-900">
                {Number(orderQuery.data.totalAmount).toFixed(2)} KM
              </span>
              <Badge variant={ORDER_STATUS_VARIANT[orderQuery.data.status]}>
                {orderQuery.data.status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Items column ─────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-4 w-4" />
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
                          <td className="py-2 text-slate-900">{item.productName}</td>
                          <td className="py-2 text-right text-slate-700">{item.quantity}</td>
                          <td className="py-2 text-right text-slate-700">
                            {Number(item.unitPrice).toFixed(2)} KM
                          </td>
                          <td className="py-2 text-right font-medium text-slate-900">
                            {(Number(item.unitPrice) * item.quantity).toFixed(2)} KM
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Deliveries ──────────────────────────────────────────── */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4" />
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
                          className="flex items-center justify-between rounded-md border border-slate-200 p-3"
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

            {/* Sidebar ───────────────────────────────────────────────────── */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shipping</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-slate-900">{orderQuery.data.shippingAddress}</p>
                </CardContent>
              </Card>

              {orderQuery.data.payment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment</CardTitle>
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
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
