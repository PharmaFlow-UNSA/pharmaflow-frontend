import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "@/api/orders";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatInstant } from "@/lib/utils";
import type { OrderStatus } from "@/types/api";

const STATUS_VARIANT: Record<OrderStatus, "info" | "warning" | "success" | "danger"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function OrdersPage() {
  const { hasRole } = useAuth();
  const isStaff = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [scope, setScope] = useState<"mine" | "all">(isStaff ? "all" : "mine");
  const [page, setPage] = useState(0);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const userId = scope === "mine" ? currentUser?.id : undefined;

  const query = useQuery({
    queryKey: ["orders", { userId, statusFilter, page }],
    queryFn: () =>
      getOrders({
        page,
        size: 10,
        sort: "createdAt,desc",
        userId,
        status: statusFilter || undefined,
      }),
    enabled: scope === "all" || !!currentUser?.id,
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isStaff && scope === "all" ? "All orders" : "My orders"}
          </h1>
          <p className="mt-1 text-slate-600">
            Backed by{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
              order-prescription-service
            </code>
            . {isStaff
              ? "Switch scope to review all users or just your own orders."
              : "Click an order to see items, payment, and delivery status."}
          </p>
        </div>
        <Link to="/products">
          <Button>
            <ShoppingBag className="mr-1.5 h-4 w-4" />
            Place new order
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as OrderStatus | "");
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        {isStaff && (
          <div className="space-y-1.5">
            <Label htmlFor="scope">Scope</Label>
            <Select
              id="scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as "mine" | "all");
                setPage(0);
              }}
            >
              <option value="mine">My orders only</option>
              <option value="all">All users (staff)</option>
            </Select>
          </div>
        )}
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && <p className="text-slate-500">Loading orders…</p>}

      {query.data && query.data.content.length === 0 && (
        <p className="text-slate-600">No orders match these filters.</p>
      )}

      {query.data && query.data.content.length > 0 && (
        <div className="space-y-3">
          {query.data.content.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="block group">
              <Card className="transition-colors group-hover:border-brand-200">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base group-hover:text-brand-700">
                      Order #{o.id}
                    </CardTitle>
                    <p className="text-sm text-slate-500">
                      User {o.userId} · {formatInstant(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-slate-900">
                      {Number(o.totalAmount).toFixed(2)} KM
                    </span>
                    <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-0.5 text-sm text-slate-700">
                    {o.orderItems?.slice(0, 3).map((item) => (
                      <li key={item.id ?? `${item.productId}-${item.productName}`}>
                        <span className="font-medium">{item.quantity}×</span> {item.productName}
                      </li>
                    ))}
                    {o.orderItems && o.orderItems.length > 3 && (
                      <li className="text-xs text-slate-500">
                        +{o.orderItems.length - 3} more item(s)
                      </li>
                    )}
                  </ul>
                  {o.payment && (
                    <p className="mt-2 text-xs text-slate-500">
                      Payment: {o.payment.method} · {o.payment.status}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {query.data.number + 1} of {Math.max(1, query.data.totalPages)} ·{" "}
              {query.data.totalElements} order(s)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
