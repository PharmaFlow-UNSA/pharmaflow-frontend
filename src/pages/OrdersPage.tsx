import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getOrders } from "@/api/orders";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { OrderStatus } from "@/types/api";

const STATUS_VARIANT: Record<OrderStatus, "info" | "warning" | "success" | "danger" | "default"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function OrdersPage() {
  const [userIdInput, setUserIdInput] = useState<string>("");
  const userId = userIdInput ? Number(userIdInput) : undefined;

  const query = useQuery({
    queryKey: ["orders", { userId }],
    queryFn: () => getOrders({ userId, size: 20, sort: "createdAt,desc" }),
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">My orders</h1>
      <p className="mb-6 text-slate-600">
        From <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">order-prescription-service</code>. In a real app the user id would come from the JWT subject; here we let you filter manually.
      </p>

      <div className="mb-6 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="userId">Filter by user id (leave empty for all)</Label>
          <Input
            id="userId"
            type="number"
            min="1"
            placeholder="e.g. 2"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
          />
        </div>
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && <p className="text-slate-500">Loading orders…</p>}

      {query.data && query.data.content.length === 0 && (
        <p className="text-slate-600">No orders found.</p>
      )}

      {query.data && query.data.content.length > 0 && (
        <div className="space-y-3">
          {query.data.content.map((o) => (
            <Card key={o.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Order #{o.id}</CardTitle>
                  <p className="text-sm text-slate-500">
                    User {o.userId} · {o.shippingAddress}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-900">
                    {Number(o.totalAmount).toFixed(2)} KM
                  </span>
                  <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>{o.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-slate-700">
                  {o.orderItems?.map((item) => (
                    <li key={item.id ?? `${item.productId}-${item.productName}`}>
                      <span className="font-medium">{item.quantity}×</span> {item.productName} —{" "}
                      {Number(item.unitPrice).toFixed(2)} KM each
                    </li>
                  ))}
                </ul>
                {o.payment && (
                  <p className="mt-2 text-xs text-slate-500">
                    Payment: {o.payment.method} · {o.payment.status}
                    {o.payment.transactionId ? ` · ${o.payment.transactionId}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
