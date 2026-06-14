import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseMedical, Eye, EyeOff, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { defaultPathForRoles } from "@/auth/defaultPath";
import { useAuth } from "@/auth/useAuth";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/toast/useToast";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const SEED_ACCOUNTS = [
  { email: "user@example.com", role: "Patient", icon: UserRound },
  { email: "doctor@example.com", role: "Doctor", icon: Stethoscope },
  { email: "pharmacist@example.com", role: "Pharmacist", icon: BriefcaseMedical },
  { email: "admin@example.com", role: "Admin", icon: ShieldCheck },
];

export function LoginPage() {
  const { login, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null);
    try {
      const authUser = await login(values);
      toast.success("Signed in successfully.");
      navigate(from === "/" ? defaultPathForRoles(authUser.roles) : from, { replace: true });
    } catch (err) {
      setSubmitError(err);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="Secure sign in"
      title="Welcome back to your PharmaFlow workspace"
      description="Continue shopping, managing orders, reviewing care workflows, or opening your professional dashboard from one connected account."
    >
      <div className="mx-auto w-full max-w-[32rem]">
        <div className="mb-5 lg:hidden">
          <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-800">
            Secure sign in
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-800">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to your PharmaFlow account.</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
          <div className="mb-6 hidden lg:block">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Account access</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-800">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use your account to continue where you left off.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <ErrorMessage error={submitError} />

            <Button type="submit" className="h-12 w-full rounded-2xl text-base font-bold" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Demo accounts &mdash; password: <code className="font-mono normal-case">password123</code>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SEED_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setValue("email", account.email, { shouldValidate: true });
                      setValue("password", "password123", { shouldValidate: true });
                    }}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-200 transition-colors group-hover:ring-brand-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold text-ink-800">{account.role}</span>
                      <span className="block truncate text-xs text-slate-500">{account.email}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-brand-700 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
