import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const SEED_ACCOUNTS = [
  { email: "user@example.com",       role: "Patient (ROLE_USER)" },
  { email: "doctor@example.com",     role: "Doctor (ROLE_DOCTOR)" },
  { email: "pharmacist@example.com", role: "Pharmacist (ROLE_PHARMACIST)" },
  { email: "admin@example.com",      role: "Admin (ROLE_ADMIN)" },
];

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);
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
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setSubmitError(err);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to PharmaFlow</CardTitle>
          <CardDescription>
            Use one of the seeded test accounts below, or your own credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <ErrorMessage error={submitError} />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              Seeded accounts (password: <code>password123</code>)
            </p>
            <ul className="space-y-1 text-sm">
              {SEED_ACCOUNTS.map((acc) => (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("email", acc.email);
                      setValue("password", "password123");
                    }}
                    className="text-left text-brand-700 hover:underline"
                  >
                    {acc.email}
                  </button>{" "}
                  <span className="text-slate-500">— {acc.role}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-sm text-slate-600">
            New here? <Link to="/register" className="text-brand-700 hover:underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
