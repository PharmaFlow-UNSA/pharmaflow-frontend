import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, HeartPulse, Pill, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type AuthPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const highlights = [
  { icon: ShieldCheck, title: "Protected account access", text: "Sign in to manage your care workflows and account settings." },
  { icon: HeartPulse, title: "Care tools in one place", text: "Orders, prescriptions, reminders, and health records stay connected." },
  { icon: Sparkles, title: "Smart pharmacy guidance", text: "Use supported recommendations and FAQ assistance when available." },
];

export function AuthPageLayout({ eyebrow, title, description, children }: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_8%_10%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_92%_12%,rgba(14,165,233,0.18),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eefdf8_100%)] px-4 py-5 text-ink-800 sm:px-6 lg:px-10">
      <header className="mx-auto flex w-full max-w-[1500px] items-center justify-between xl:w-[80vw]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl text-lg font-extrabold tracking-tight text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Pill className="h-5 w-5" />
          </span>
          PharmaFlow
        </Link>
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-bold text-slate-700 shadow-sm shadow-slate-900/5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1500px] items-center gap-8 py-8 xl:w-[80vw] lg:grid-cols-[minmax(0,1fr)_minmax(25rem,32rem)] lg:py-12">
        <section className="relative hidden overflow-hidden rounded-[2.25rem] bg-[radial-gradient(circle_at_82%_18%,rgba(45,212,191,0.28),transparent_25%),linear-gradient(135deg,#0f172a_0%,#172554_58%,#0f766e_100%)] p-8 text-white shadow-2xl shadow-slate-900/15 animate-section lg:block">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-300/20 blur-2xl" />
          <div className="absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-sky-300/15 blur-3xl" />
          <div className="relative">
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-100 ring-1 ring-white/15">
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">
              {description}
            </p>

            <div className="mt-8 grid gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-brand-100 ring-1 ring-white/15">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="font-bold text-white">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-200">{item.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-[2rem] bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/20">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-ink-800">Pharmacy storefront meets care workspace</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">A calm place to shop, review, and manage account activity.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full animate-section">{children}</section>
      </main>
    </div>
  );
}
