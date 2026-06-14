import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getDeliveries } from "@/api/deliveries";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatInstant } from "@/lib/utils";
import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from "@/types/api";

const STATUS_VARIANT: Record<DeliveryStatus, "info" | "warning" | "success" | "danger"> = {
  PREPARING: "warning",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  FAILED: "danger",
  RETURNED: "warning",
};

export function DeliveriesPage() {
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "">("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [page, setPage] = useState(0);

  const orderId = orderIdInput ? Number(orderIdInput) : undefined;

  const query = useQuery({
    queryKey: ["deliveries", { statusFilter, orderId, page }],
    queryFn: () =>
      getDeliveries({
        page,
        size: 10,
        sort: "estimatedDelivery,desc",
        status: statusFilter || undefined,
        orderId,
      }),
    placeholderData: keepPreviousData,
  });
  const deliveries = query.data?.content ?? [];
  const inTransitCount = deliveries.filter((delivery) => delivery.status === "IN_TRANSIT").length;
  const deliveredCount = deliveries.filter((delivery) => delivery.status === "DELIVERED").length;

  return (
    <div className="space-y-7 animate-section">
      <AdminPageHeader
        eyebrow="Fulfillment operations"
        title="Deliveries"
        description="Monitor shipments dispatched from partner pharmacies and review order fulfillment status."
        icon={Truck}
        stats={[
          { label: "Visible deliveries", value: query.data?.totalElements ?? "..." },
          { label: "In transit here", value: inTransitCount },
          { label: "Delivered here", value: deliveredCount },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as DeliveryStatus | "");
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orderId">Filter by order number</Label>
          <Input
            id="orderId"
            type="number"
            min={1}
            placeholder="e.g. 42"
            value={orderIdInput}
            onChange={(e) => {
              setOrderIdInput(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[1.75rem] skeleton-shimmer" />
          ))}
        </div>
      )}

      {query.data && query.data.content.length === 0 && (
        <EmptyState
          title="No deliveries match these filters"
          description="Try a different status or order number."
          icon={Truck}
        />
      )}

      {query.data && query.data.content.length > 0 && (
        <div className="space-y-3">
          {query.data.content.map((d) => (
            <Card key={d.id} className="rounded-[1.75rem] hover-lift">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Delivery #{d.id} ·{" "}
                      <Link
                        to={`/orders/${d.orderId}`}
                        className="text-brand-700 hover:underline"
                      >
                        Order #{d.orderId}
                      </Link>
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-slate-500">
                      From{" "}
                      <Link
                        to={`/pharmacies/${d.pharmacyId}`}
                        className="text-brand-700 hover:underline"
                      >
                        pharmacy #{d.pharmacyId}
                      </Link>{" "}
                      to {d.deliveryAddress}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[d.status]}>
                  {DELIVERY_STATUS_LABELS[d.status]}
                </Badge>
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                ETA: {formatInstant(d.estimatedDelivery)}
                {d.actualDelivery && ` · Delivered: ${formatInstant(d.actualDelivery)}`}
              </CardContent>
            </Card>
          ))}

          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {query.data.number + 1} of {Math.max(1, query.data.totalPages)} ·{" "}
              {query.data.totalElements} deliver{query.data.totalElements === 1 ? "y" : "ies"}
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
