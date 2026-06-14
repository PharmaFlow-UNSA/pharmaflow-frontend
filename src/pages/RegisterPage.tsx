import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Info, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/auth/useAuth";
import { AuthPageLayout } from "@/components/AuthPageLayout";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/toast/useToast";

const registerSchema = z.object({
  firstName: z.string().min(1, "Required").max(50, "Max 50 characters"),
  lastName: z.string().min(1, "Required").max(50, "Max 50 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setSubmitError(null);
    try {
      await registerUser({ ...values, role: "ROLE_USER" });
      toast.success("Account created successfully.");
      navigate(from, { replace: true });
    } catch (err) {
      setSubmitError(err);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="Create patient account"
      title="Join PharmaFlow with a calm, connected care account"
      description="Create a customer account for shopping pharmacy products and managing your personal care workflows."
    >
      <div className="mx-auto w-full max-w-[32rem]">
        <div className="mb-5 lg:hidden">
          <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-800">
            Create patient account
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-800">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Start with a personal PharmaFlow account.</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
          <div className="mb-6 hidden lg:block">
            <p className="text-sm font-bold uppercase tracking-wider text-brand-700">Patient account</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-800">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Public registration creates a customer account.</p>
          </div>

          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm text-brand-900">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100">
              <UserRound className="h-4 w-4" />
            </span>
            <div>
              <p className="font-extrabold">Customer access only</p>
              <p className="mt-1 leading-6 text-brand-900/80">
                Professional and admin roles are not available through public self-registration.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoFocus
                  placeholder="Ana"
                  {...register("firstName")}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Petrović"
                  {...register("lastName")}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
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
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
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

            <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              Professional workspace access is managed outside public sign-up.
            </div>

            <ErrorMessage error={submitError} />

            <Button type="submit" className="h-12 w-full rounded-2xl text-base font-bold" size="lg" disabled={loading}>
              {loading ? "Creating account…" : "Create patient account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
