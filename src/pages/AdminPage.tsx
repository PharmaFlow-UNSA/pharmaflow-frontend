import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileQuestion, MessageSquareText, PackageSearch, ShieldCheck, Sparkles, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getFraudChecks, getFraudRules } from "@/api/fraud";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { FraudDecision } from "@/types/api";

const decisionVariant: Record<FraudDecision, "success" | "warning" | "danger"> = {
  APPROVED: "success",
  REVIEW: "warning",
  BLOCKED: "danger",
};

export function AdminPage() {
  const checksQuery = useQuery({
    queryKey: ["fraud-checks", "admin-summary"],
    queryFn: () => getFraudChecks(),
  });

  const rulesQuery = useQuery({
    queryKey: ["fraud-rules"],
    queryFn: getFraudRules,
  });

  const checks = checksQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const reviewCount = checks.filter((check) => check.decision === "REVIEW").length;
  const blockedCount = checks.filter((check) => check.decision === "BLOCKED").length;
  const activeRules = rules.filter((rule) => rule.isActive).length;
  const highestRisk = checks.reduce((max, check) => Math.max(max, Number(check.riskScore ?? 0)), 0);
  const recentChecks = checks.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-slate-600">
            Monitor pharmacy operations, order risk, and smart feature controls.
          </p>
        </div>
        <Link
          to="/admin/fraud"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 sm:w-auto"
        >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Open fraud workspace
        </Link>
      </div>

      {(checksQuery.isError || rulesQuery.isError) && (
        <ErrorMessage error={checksQuery.error ?? rulesQuery.error} />
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total checks" value={checks.length} loading={checksQuery.isLoading} />
        <MetricCard label="Needs review" value={reviewCount} loading={checksQuery.isLoading} tone="warning" />
        <MetricCard label="Blocked" value={blockedCount} loading={checksQuery.isLoading} tone="danger" />
        <MetricCard label="Active rules" value={activeRules} loading={rulesQuery.isLoading} />
        <MetricCard
          label="Highest risk"
          value={checks.length > 0 ? highestRisk.toFixed(1) : "No data"}
          loading={checksQuery.isLoading}
          tone={highestRisk >= 70 ? "danger" : highestRisk >= 30 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent fraud checks</CardTitle>
              <CardDescription>Latest smart-features-service fraud decisions.</CardDescription>
            </div>
            <Link
              to="/admin/fraud"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
            >
              Review
            </Link>
          </CardHeader>
          <CardContent>
            {checksQuery.isLoading && <p className="text-sm text-slate-500">Loading fraud checks...</p>}
            {!checksQuery.isLoading && recentChecks.length === 0 && (
              <p className="text-sm text-slate-600">
                No fraud checks have been recorded yet. Run a check from the fraud workspace.
              </p>
            )}
            {recentChecks.length > 0 && (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Check</th>
                      <th className="px-3 py-2 font-medium">Order</th>
                      <th className="px-3 py-2 font-medium">Risk</th>
                      <th className="px-3 py-2 font-medium">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {recentChecks.map((check) => (
                      <tr key={check.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">#{check.id}</td>
                        <td className="px-3 py-2 text-slate-600">#{check.orderId}</td>
                        <td className="px-3 py-2 text-slate-900">{Number(check.riskScore).toFixed(1)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={decisionVariant[check.decision]}>{check.decision}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AdminShortcut
            to="/orders"
            icon={ClipboardList}
            title="Orders"
            description="Review order volume, users, payment status, and fulfillment state."
          />
          <AdminShortcut
            to="/products"
            icon={PackageSearch}
            title="Product catalog"
            description="Browse product details, prescription flags, pricing, and availability."
          />
          <AdminShortcut
            to="/admin/recommendations"
            icon={Sparkles}
            title="Recommendations"
            description="Generate and maintain smart product suggestions for users and profiles."
          />
          <AdminShortcut
            to="/admin/faqs"
            icon={FileQuestion}
            title="FAQ management"
            description="Create, edit, activate, and remove FAQ assistant content."
          />
          <AdminShortcut
            to="/admin/faq-logs"
            icon={MessageSquareText}
            title="FAQ audit logs"
            description="Review silently captured FAQ bot sessions by user id."
          />
          <AdminShortcut
            to="/profile"
            icon={UserCircle}
            title="Account"
            description="Review the currently authenticated admin profile."
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
  tone = "default",
}: {
  label: string;
  value: number | string;
  loading: boolean;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger" ? "text-red-700" : tone === "warning" ? "text-amber-700" : "text-slate-900";

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
        <p className={"mt-2 text-2xl font-semibold " + toneClass}>{loading ? "..." : value}</p>
      </CardContent>
    </Card>
  );
}

function AdminShortcut({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <span className="rounded-md bg-slate-100 p-2 text-slate-700">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
