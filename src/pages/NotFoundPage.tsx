import { Link } from "react-router-dom";
import { Pill } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
        <Pill className="h-7 w-7" />
      </div>
      <h1 className="text-6xl font-bold tracking-tight text-slate-900">404</h1>
      <p className="mt-3 text-lg font-medium text-slate-700">Page not found</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Go to dashboard
        </Link>
        <Link
          to="/health"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Health record
        </Link>
      </div>
    </div>
  );
}
