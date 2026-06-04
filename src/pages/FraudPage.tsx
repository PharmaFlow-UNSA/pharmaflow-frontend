import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ClipboardCheck,
  FileClock,
  Pencil,
  Play,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  createFraudCheck,
  createFraudRule,
  deleteFraudRule,
  getFraudCheckLogs,
  getFraudChecks,
  getFraudRules,
  updateFraudRule,
} from "@/api/fraud";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";
import type {
  FraudCheckDTO,
  FraudDecision,
  FraudEventType,
  FraudRuleCategory,
  FraudRuleCode,
  FraudRuleDTO,
  FraudRulePayload,
} from "@/types/api";

type FraudTab = "checks" | "rules" | "logs";

const RULE_META: Record<FraudRuleCode, { label: string; category: FraudRuleCategory }> = {
  ORDER_HIGH_QUANTITY: { label: "Order high quantity", category: "ORDER" },
  ORDER_VELOCITY: { label: "Too many orders in short time", category: "ORDER" },
  PAYMENT_REPEATED_FAILURES: { label: "Repeated failed payments", category: "ORDER" },
  USER_RESTRICTED_PRODUCT_FREQUENCY: { label: "Restricted products too often", category: "ORDER" },
  ACCOUNT_SHARED_CONTACT: { label: "Shared account contact signals", category: "ACCOUNT" },
  ACCOUNT_NEW_LARGE_ORDER: { label: "New account large order", category: "ACCOUNT" },
  ACCOUNT_SUSPICIOUS_ACCESS: { label: "Suspicious login or device changes", category: "ACCOUNT" },
  PRESCRIPTION_REJECTED_REPEAT: { label: "Repeated rejected prescriptions", category: "PRESCRIPTION" },
  PRESCRIPTION_REUSED: { label: "Prescription reused", category: "PRESCRIPTION" },
  PRESCRIPTION_MANY_USERS: { label: "Prescription used by many users", category: "PRESCRIPTION" },
  PRODUCT_CONTROLLED_QUANTITY: { label: "Controlled or sensitive product quantity", category: "PRODUCT" },
  PRODUCT_UNUSUAL_COMBINATION: { label: "Unusual product combination", category: "PRODUCT" },
};

const FRAUD_RULE_CODES = [
  "ORDER_HIGH_QUANTITY",
  "ORDER_VELOCITY",
  "PAYMENT_REPEATED_FAILURES",
  "USER_RESTRICTED_PRODUCT_FREQUENCY",
  "ACCOUNT_SHARED_CONTACT",
  "ACCOUNT_NEW_LARGE_ORDER",
  "ACCOUNT_SUSPICIOUS_ACCESS",
  "PRESCRIPTION_REJECTED_REPEAT",
  "PRESCRIPTION_REUSED",
  "PRESCRIPTION_MANY_USERS",
  "PRODUCT_CONTROLLED_QUANTITY",
  "PRODUCT_UNUSUAL_COMBINATION",
] as const;

const decisionVariant: Record<FraudDecision, "success" | "warning" | "danger"> = {
  APPROVED: "success",
  REVIEW: "warning",
  BLOCKED: "danger",
};

const eventVariant: Record<FraudEventType, "default" | "outline" | "success" | "warning" | "danger" | "info"> = {
  TRIGGERED: "warning",
  REVIEWED: "info",
  BLOCKED: "danger",
  CLEARED: "success",
  SKIPPED: "outline",
};

const checkSchema = z.object({
  orderId: z
    .number({ error: "Order id is required" })
    .int("Order id must be a whole number")
    .positive("Order id must be positive"),
});

const ruleSchema = z
  .object({
    ruleName: z.string().trim().min(3, "Rule name must be at least 3 characters").max(100),
    ruleCode: z.enum(FRAUD_RULE_CODES),
    category: z.enum(["ORDER", "ACCOUNT", "PRESCRIPTION", "PRODUCT"]),
    description: z.string().trim().max(500, "Description must not exceed 500 characters").optional(),
    weight: z
      .number({ error: "Weight is required" })
      .gt(0, "Weight must be greater than 0")
      .max(100, "Weight must be at most 100"),
    isActive: z.boolean(),
  })
  .refine((value) => RULE_META[value.ruleCode].category === value.category, {
    path: ["category"],
    message: "Category must match the selected rule code",
  });

type CheckFormValues = z.infer<typeof checkSchema>;
type RuleFormValues = z.infer<typeof ruleSchema>;

export function FraudPage() {
  const [tab, setTab] = useState<FraudTab>("checks");
  const [filters, setFilters] = useState<{ userId?: number; orderId?: number }>({});
  const [draftFilters, setDraftFilters] = useState({ userId: "", orderId: "" });
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<FraudRuleDTO | null>(null);
  const queryClient = useQueryClient();

  const checksQuery = useQuery({
    queryKey: ["fraud-checks", filters],
    queryFn: () => getFraudChecks(filters),
    placeholderData: keepPreviousData,
  });

  const rulesQuery = useQuery({
    queryKey: ["fraud-rules"],
    queryFn: getFraudRules,
  });

  const checks = useMemo(() => checksQuery.data ?? [], [checksQuery.data]);
  const effectiveSelectedCheckId =
    selectedCheckId !== null && checks.some((check) => check.id === selectedCheckId)
      ? selectedCheckId
      : checks[0]?.id ?? null;
  const selectedCheck = useMemo(
    () => checks.find((check) => check.id === effectiveSelectedCheckId) ?? null,
    [checks, effectiveSelectedCheckId]
  );

  const logsQuery = useQuery({
    queryKey: ["fraud-check-logs", effectiveSelectedCheckId],
    queryFn: () => getFraudCheckLogs(effectiveSelectedCheckId ?? 0),
    enabled: effectiveSelectedCheckId !== null,
  });

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const userId = draftFilters.userId ? Number(draftFilters.userId) : undefined;
    const orderId = draftFilters.orderId ? Number(draftFilters.orderId) : undefined;
    if (
      (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) ||
      (orderId !== undefined && (!Number.isInteger(orderId) || orderId <= 0))
    ) {
      setFilterError("Filter ids must be positive whole numbers.");
      return;
    }
    setFilterError(null);
    setFilters({
      userId,
      orderId,
    });
  };

  const resetFilters = () => {
    setDraftFilters({ userId: "", orderId: "" });
    setFilterError(null);
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Fraud detection</h1>
        <p className="mt-1 text-slate-600">
          Run order checks, manage evaluator rules, and inspect smart-features audit logs.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <TabButton active={tab === "checks"} onClick={() => setTab("checks")} icon={ClipboardCheck}>
          Checks
        </TabButton>
        <TabButton active={tab === "rules"} onClick={() => setTab("rules")} icon={ShieldAlert}>
          Rules
        </TabButton>
        <TabButton active={tab === "logs"} onClick={() => setTab("logs")} icon={FileClock}>
          Logs
        </TabButton>
      </div>

      {tab === "checks" && (
        <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-4">
            <RunCheckCard />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filter checks</CardTitle>
                <CardDescription>Filter by backend-supported user or order id.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={applyFilters} className="space-y-3">
                  {filterError && <p className="text-sm text-red-700">{filterError}</p>}
                  <div className="space-y-1.5">
                    <Label htmlFor="fraudUserId">User id</Label>
                    <Input
                      id="fraudUserId"
                      type="number"
                      min="1"
                      value={draftFilters.userId}
                      onChange={(event) =>
                        setDraftFilters((current) => ({ ...current, userId: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fraudOrderId">Order id</Label>
                    <Input
                      id="fraudOrderId"
                      type="number"
                      min="1"
                      value={draftFilters.orderId}
                      onChange={(event) =>
                        setDraftFilters((current) => ({ ...current, orderId: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Apply</Button>
                    <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <ChecksTable
            checks={checks}
            isLoading={checksQuery.isLoading}
            error={checksQuery.error}
            selectedCheckId={effectiveSelectedCheckId}
            onSelect={(check) => {
              setSelectedCheckId(check.id);
              setTab("logs");
            }}
          />
        </section>
      )}

      {tab === "rules" && (
        <section className="grid gap-4 xl:grid-cols-[1fr_2fr]">
          <RuleFormCard
            editingRule={editingRule}
            onCancel={() => setEditingRule(null)}
            onSaved={() => {
              setEditingRule(null);
              void queryClient.invalidateQueries({ queryKey: ["fraud-rules"] });
            }}
          />
          <RulesTable
            rules={rulesQuery.data ?? []}
            isLoading={rulesQuery.isLoading}
            error={rulesQuery.error}
            onEdit={setEditingRule}
          />
        </section>
      )}

      {tab === "logs" && (
        <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          <ChecksTable
            checks={checks}
            isLoading={checksQuery.isLoading}
            error={checksQuery.error}
            selectedCheckId={effectiveSelectedCheckId}
            onSelect={(check) => setSelectedCheckId(check.id)}
            compact
          />
          <LogsCard
            selectedCheck={selectedCheck}
            isLoading={logsQuery.isLoading}
            error={logsQuery.error}
            logs={logsQuery.data ?? []}
          />
        </section>
      )}
    </div>
  );
}

function RunCheckCard() {
  const queryClient = useQueryClient();
  const [createdCheck, setCreatedCheck] = useState<FraudCheckDTO | null>(null);
  const form = useForm<CheckFormValues>({
    resolver: zodResolver(checkSchema),
  });

  const mutation = useMutation({
    mutationFn: createFraudCheck,
    onSuccess: (check) => {
      setCreatedCheck(check);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["fraud-checks"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Run fraud check</CardTitle>
        <CardDescription>Submit an order id to evaluate active backend rules.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="space-y-3"
        >
          {mutation.isError && <ErrorMessage error={mutation.error} />}
          <div className="space-y-1.5">
            <Label htmlFor="runOrderId">Order id</Label>
            <Input
              id="runOrderId"
              type="number"
              min="1"
              {...form.register("orderId", { valueAsNumber: true })}
              disabled={mutation.isPending}
            />
            {form.formState.errors.orderId && (
              <p className="text-xs text-red-700">{form.formState.errors.orderId.message}</p>
            )}
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <Play className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Running..." : "Run check"}
          </Button>
        </form>
        {createdCheck && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Created check #{createdCheck.id}</p>
            <p className="mt-1 text-slate-600">
              Risk {Number(createdCheck.riskScore).toFixed(1)} for order #{createdCheck.orderId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RuleFormCard({
  editingRule,
  onCancel,
  onSaved,
}: {
  editingRule: FraudRuleDTO | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const defaultCode = "ORDER_HIGH_QUANTITY";
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      ruleName: "",
      ruleCode: defaultCode,
      category: RULE_META[defaultCode].category,
      description: "",
      weight: 20,
      isActive: true,
    } as RuleFormValues,
  });

  const selectedCode = useWatch({ control: form.control, name: "ruleCode" }) ?? defaultCode;
  const mutation = useMutation({
    mutationFn: (payload: FraudRulePayload) =>
      editingRule ? updateFraudRule(editingRule.id, payload) : createFraudRule(payload),
    onSuccess: () => {
      form.reset({
        ruleName: "",
        ruleCode: defaultCode,
        category: RULE_META[defaultCode].category,
        description: "",
        weight: 20,
        isActive: true,
      });
      onSaved();
    },
  });

  useEffect(() => {
    if (editingRule) {
      form.reset({
        ruleName: editingRule.ruleName,
        ruleCode: editingRule.ruleCode,
        category: editingRule.category,
        description: editingRule.description ?? "",
        weight: editingRule.weight,
        isActive: editingRule.isActive,
      });
      return;
    }

    form.reset({
      ruleName: "",
      ruleCode: defaultCode,
      category: RULE_META[defaultCode].category,
      description: "",
      weight: 20,
      isActive: true,
    });
  }, [editingRule, form]);

  useEffect(() => {
    form.setValue("category", RULE_META[selectedCode].category, { shouldValidate: true });
  }, [form, selectedCode]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{editingRule ? "Edit rule" : "Create rule"}</CardTitle>
          <CardDescription>Rule code and category must match backend evaluator support.</CardDescription>
        </div>
        {editingRule && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate({
              ...values,
              description: values.description?.trim() || undefined,
            })
          )}
        >
          {mutation.isError && <ErrorMessage error={mutation.error} />}
          <div className="space-y-1.5">
            <Label htmlFor="ruleName">Rule name</Label>
            <Input id="ruleName" {...form.register("ruleName")} disabled={mutation.isPending} />
            <FormError message={form.formState.errors.ruleName?.message} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ruleCode">Rule code</Label>
              <select
                id="ruleCode"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                {...form.register("ruleCode")}
                disabled={mutation.isPending}
              >
                {FRAUD_RULE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <FormError message={form.formState.errors.ruleCode?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...form.register("category")} readOnly />
              <FormError message={form.formState.errors.category?.message} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("description")}
              disabled={mutation.isPending}
            />
            <FormError message={form.formState.errors.description?.message} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                {...form.register("weight", { valueAsNumber: true })}
                disabled={mutation.isPending}
              />
              <FormError message={form.formState.errors.weight?.message} />
            </div>
            <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" {...form.register("isActive")} disabled={mutation.isPending} />
              Active rule
            </label>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {mutation.isPending ? "Saving..." : editingRule ? "Save rule" : "Create rule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ChecksTable({
  checks,
  isLoading,
  error,
  selectedCheckId,
  onSelect,
  compact = false,
}: {
  checks: FraudCheckDTO[];
  isLoading: boolean;
  error: unknown;
  selectedCheckId: number | null;
  onSelect: (check: FraudCheckDTO) => void;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fraud checks</CardTitle>
        <CardDescription>Select a check to inspect its audit log.</CardDescription>
      </CardHeader>
      <CardContent>
        {Boolean(error) && <ErrorMessage error={error} />}
        {isLoading && <p className="text-sm text-slate-500">Loading fraud checks...</p>}
        {!isLoading && checks.length === 0 && (
          <p className="text-sm text-slate-600">No fraud checks found for the current filters.</p>
        )}
        {checks.length > 0 && (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Check</th>
                  {!compact && <th className="px-3 py-2 font-medium">User</th>}
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Decision</th>
                  {!compact && <th className="px-3 py-2 font-medium">Checked</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {checks.map((check) => (
                  <tr
                    key={check.id}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50",
                      selectedCheckId === check.id && "bg-brand-50"
                    )}
                    onClick={() => onSelect(check)}
                  >
                    <td className="px-3 py-2 font-medium text-slate-900">#{check.id}</td>
                    {!compact && <td className="px-3 py-2 text-slate-600">#{check.userId}</td>}
                    <td className="px-3 py-2 text-slate-600">#{check.orderId}</td>
                    <td className="px-3 py-2 text-slate-900">{Number(check.riskScore).toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={decisionVariant[check.decision]}>{check.decision}</Badge>
                    </td>
                    {!compact && (
                      <td className="px-3 py-2 text-slate-500">{formatDateTime(check.checkedAt)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RulesTable({
  rules,
  isLoading,
  error,
  onEdit,
}: {
  rules: FraudRuleDTO[];
  isLoading: boolean;
  error: unknown;
  onEdit: (rule: FraudRuleDTO) => void;
}) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteFraudRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fraud-rules"] });
    },
  });

  const removeRule = (rule: FraudRuleDTO) => {
    if (window.confirm(`Delete fraud rule "${rule.ruleName}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rules</CardTitle>
        <CardDescription>Admin-only evaluator configuration from smart-features-service.</CardDescription>
      </CardHeader>
      <CardContent>
        {(error || deleteMutation.isError) && <ErrorMessage error={error ?? deleteMutation.error} />}
        {isLoading && <p className="text-sm text-slate-500">Loading rules...</p>}
        {!isLoading && rules.length === 0 && (
          <p className="text-sm text-slate-600">No fraud rules found.</p>
        )}
        {rules.length > 0 && (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Rule</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Weight</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{rule.ruleName}</p>
                      <p className="text-xs text-slate-500">{rule.ruleCode}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{rule.category}</td>
                    <td className="px-3 py-2 text-slate-900">{Number(rule.weight).toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={rule.isActive ? "success" : "outline"}>
                        {rule.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRule(rule)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LogsCard({
  selectedCheck,
  isLoading,
  error,
  logs,
}: {
  selectedCheck: FraudCheckDTO | null;
  isLoading: boolean;
  error: unknown;
  logs: Array<{
    id: number;
    fraudCheckId: number;
    fraudRuleId: number;
    eventType: FraudEventType;
    details: string;
    scoreContribution: number;
    createdAt: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {selectedCheck ? `Audit logs for check #${selectedCheck.id}` : "Audit logs"}
        </CardTitle>
        <CardDescription>Rule outcomes and score contributions from the fraud evaluator.</CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedCheck && <p className="text-sm text-slate-600">Select a fraud check to view logs.</p>}
        {Boolean(error) && <ErrorMessage error={error} />}
        {selectedCheck && isLoading && <p className="text-sm text-slate-500">Loading logs...</p>}
        {selectedCheck && !isLoading && logs.length === 0 && (
          <p className="text-sm text-slate-600">No audit logs exist for this check.</p>
        )}
        {logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-900">Rule #{log.fraudRuleId}</span>
                    <Badge variant={eventVariant[log.eventType]}>{log.eventType}</Badge>
                  </div>
                  <span className="text-sm text-slate-500">{formatDateTime(log.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{log.details}</p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  Score contribution: {Number(log.scoreContribution).toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-700">{String(message)}</p>;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
