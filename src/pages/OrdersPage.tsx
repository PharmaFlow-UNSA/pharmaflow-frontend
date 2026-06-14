import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PackageCheck, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "@/api/orders";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
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

  const orders = query.data?.content ?? [];
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const confirmedCount = orders.filter((order) => order.status === "CONFIRMED").length;

  return (
    <div className="space-y-7 animate-section">
      <AdminPageHeader
        eyebrow={isStaff ? "Order operations" : "My Care"}
        title={isStaff && scope === "all" ? "Orders" : "My orders"}
        description={
          isStaff
            ? "Review order activity, payment status, and fulfillment progression across accounts."
            : "Review items, payment details, and order status from one place."
        }
        icon={PackageCheck}
        tone={isStaff ? "dark" : "light"}
        stats={
          query.data
            ? [
                { label: "Total visible", value: query.data.totalElements },
                { label: "Pending here", value: pendingCount },
                { label: "Confirmed here", value: confirmedCount },
              ]
            : undefined
        }
        action={
          <Link to="/products">
            <Button className="bg-white text-brand-700 hover:bg-brand-50">
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              Place new order
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
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
              <option value="all">All accounts (staff)</option>
            </Select>
          </div>
        )}
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && (
        <div className="grid gap-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-28 skeleton-shimmer rounded-[1.75rem]" />
          ))}
        </div>
      )}

      {query.data && query.data.content.length === 0 && (
        <EmptyState
          title="No orders match these filters"
          description="Try another status or place a new order."
          icon={PackageCheck}
        />
      )}

      {query.data && query.data.content.length > 0 && (
        <div className="space-y-3">
          {query.data.content.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="block group">
              <Card className="hover-lift transition-colors group-hover:border-brand-200 group-hover:shadow-md">
                <CardHeader className="flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <PackageCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-lg group-hover:text-brand-700">
                        Order #{o.id}
                      </CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Account record · {formatInstant(o.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span className="text-xl font-extrabold text-ink-800">
                      {Number(o.totalAmount).toFixed(2)} KM
                    </span>
                    <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-slate-700">
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

          <div className="mt-5 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
