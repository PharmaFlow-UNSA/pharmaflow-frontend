import type { ComponentType, ReactNode } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow = "Admin tools",
  title,
  description,
  icon: Icon,
  action,
  stats,
  tone = "dark",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  stats?: Array<{ label: string; value: ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }>;
  tone?: "dark" | "light";
}) {
  const sectionClass =
    tone === "light"
      ? "overflow-hidden rounded-[1.75rem] border border-brand-100 bg-[radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] p-6 text-ink-800 shadow-sm sm:p-7 lg:p-8"
      : "overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_85%_15%,rgba(20,184,166,0.22),transparent_28%),linear-gradient(135deg,#0f172a_0%,#164e63_52%,#ecfeff_160%)] p-6 text-white shadow-sm sm:p-7 lg:p-8";
  const eyebrowClass =
    tone === "light"
      ? "mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100"
      : "mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-50 ring-1 ring-white/15";
  const descriptionClass = tone === "light" ? "mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base" : "mt-2 max-w-2xl text-sm leading-6 text-cyan-50/90 sm:text-base";
  const statClass = tone === "light" ? "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100" : "rounded-2xl bg-white/10 p-4 ring-1 ring-white/15";
  const statLabelClass = tone === "light" ? "text-xs font-semibold uppercase text-slate-500" : "text-xs font-semibold uppercase text-cyan-50/75";

  return (
    <section className={sectionClass}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className={eyebrowClass}>
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {eyebrow}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className={descriptionClass}>{description}</p>
        </div>
        {action}
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={statClass}>
              <p className={statLabelClass}>{stat.label}</p>
              <p className="mt-1 text-2xl font-extrabold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  loading = false,
}: {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  loading?: boolean;
}) {
  const toneClass = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-brand-100 text-brand-700",
  }[tone];

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-extrabold text-ink-800">{loading ? "..." : value}</p>
          </div>
          {Icon && (
            <span className={cn("rounded-2xl p-2.5", toneClass)}>
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 font-semibold text-ink-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminQuickLink({
  to,
  icon: Icon,
  title,
  description,
  badge,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="rounded-2xl transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-5">
          <span className="rounded-2xl bg-brand-50 p-3 text-brand-700 ring-1 ring-brand-100">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-ink-800">{title}</h2>
              {badge && <Badge variant="info">{badge}</Badge>}
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
