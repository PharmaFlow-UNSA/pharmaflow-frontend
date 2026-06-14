import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { getProductById, getProducts } from "@/api/products";
import {
  createRecommendation,
  generateRecommendations,
  getRecommendations,
  logRecommendationInteraction,
  updateRecommendation,
} from "@/api/recommendations";
import { getUsers } from "@/api/users";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import {
  RECOMMENDATION_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  formatRecommendationScore,
  recommendationStatusVariant,
} from "@/components/recommendations/recommendationMeta";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatInstant, toBackendLocalDateTime } from "@/lib/utils";
import { useToast } from "@/toast/useToast";
import type {
  ProductDTO,
  RecommendationDTO,
  RecommendationPayload,
  UserDTO,
} from "@/types/api";

const SUPPORTED_GENERATION_TYPES = ["FOR_YOU", "SIMILAR_PRODUCT", "ALTERNATIVE"] as const;
const ALL_RECOMMENDATION_TYPES = [
  "FREQUENTLY_BOUGHT_TOGETHER",
  "FOR_YOU",
  "SEASONAL",
  "SIMILAR_PRODUCT",
  "ALTERNATIVE",
] as const;

const optionalPositiveInt = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0), {
    message: "Must be a positive whole number",
  });

const optionalFutureDate = z
  .string()
  .trim()
  .refine((value) => value === "" || new Date(value).getTime() > Date.now(), {
    message: "Expiry must be in the future",
  });

const generateSchema = z
  .object({
    userId: z.number({ error: "Choose an account" }).int().positive("Choose an account"),
    patientProfileId: optionalPositiveInt,
    recommendationType: z.enum(SUPPORTED_GENERATION_TYPES),
    seedProductId: optionalPositiveInt,
    symptomIds: z.string().trim(),
    limit: z.number({ error: "Limit is required" }).int().min(1).max(50),
    expiresAt: optionalFutureDate,
  })
  .refine(
    (value) =>
      value.recommendationType === "FOR_YOU" || (value.seedProductId !== "" && Number(value.seedProductId) > 0),
    {
      path: ["seedProductId"],
      message: "Seed product is required for similar and alternative recommendations",
    }
  )
  .refine(
    (value) =>
      value.symptomIds === "" ||
      value.symptomIds
        .split(",")
        .every((id) => /^\d+$/.test(id.trim()) && Number(id.trim()) > 0),
    {
      path: ["symptomIds"],
      message: "Symptom references must be comma-separated positive whole numbers",
    }
  );

const recommendationSchema = z.object({
  userId: z.number({ error: "Choose an account" }).int().positive("Choose an account"),
  patientProfileId: optionalPositiveInt,
  productId: z.number({ error: "Choose a product" }).int().positive("Choose a product"),
  recommendationType: z.enum(ALL_RECOMMENDATION_TYPES),
  score: z
    .string()
    .trim()
    .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 1), {
      message: "Score must be between 0 and 1",
    }),
  reasonText: z.string().trim().max(500, "Reason must not exceed 500 characters"),
  expiresAt: optionalFutureDate,
});

type GenerateFormValues = z.infer<typeof generateSchema>;
type RecommendationFormValues = z.infer<typeof recommendationSchema>;

export function AdminRecommendationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useState<{ userId?: number; patientProfileId?: number }>({});
  const [draftFilters, setDraftFilters] = useState({ userId: "", patientProfileId: "" });
  const [filterError, setFilterError] = useState<string | null>(null);
  const [editingRecommendation, setEditingRecommendation] = useState<RecommendationDTO | null>(null);

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", "admin", filters],
    queryFn: () => getRecommendations(filters),
    placeholderData: keepPreviousData,
  });
  const usersQuery = useQuery({
    queryKey: ["users", "recommendation-admin"],
    queryFn: () => getUsers({ page: 0, size: 100, sort: "email,asc" }),
  });

  const recommendations = useMemo(
    () => recommendationsQuery.data ?? [],
    [recommendationsQuery.data]
  );
  const productIds = useMemo(
    () => [...new Set(recommendations.map((recommendation) => recommendation.productId))],
    [recommendations]
  );
  const productQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ["product", productId],
      queryFn: () => getProductById(productId),
      staleTime: 60_000,
    })),
  });
  const productsById = useMemo(() => {
    const map = new Map<number, ProductDTO>();
    productQueries.forEach((query, index) => {
      if (query.data) map.set(productIds[index], query.data);
    });
    return map;
  }, [productIds, productQueries]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const userId = draftFilters.userId ? Number(draftFilters.userId) : undefined;
    const patientProfileId = draftFilters.patientProfileId
      ? Number(draftFilters.patientProfileId)
      : undefined;
    if (
      (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) ||
      (patientProfileId !== undefined &&
        (!Number.isInteger(patientProfileId) || patientProfileId <= 0))
    ) {
      setFilterError("Choose a valid account or clear the filter.");
      return;
    }
    setFilterError(null);
    setFilters({ userId, patientProfileId });
  };

  const dismissMutation = useMutation({
    mutationFn: (id: number) => logRecommendationInteraction(id, "DISMISSED"),
    onSuccess: () => {
      toast.success("Recommendation dismissed.");
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
    meta: { errorMessage: "Could not update recommendation. Please try again." },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Sparkles}
        eyebrow="Smart features"
        title="Recommendation management"
        description="Create and review product suggestions for selected profiles."
        stats={[
          { label: "Recommendations", value: recommendationsQuery.isLoading ? "..." : recommendations.length },
          { label: "Active", value: recommendations.filter((item) => item.status === "ACTIVE").length },
          { label: "Accounts loaded", value: usersQuery.isLoading ? "..." : usersQuery.data?.totalElements ?? 0 },
        ]}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GenerateRecommendationsCard users={usersQuery.data?.content ?? []} />
        <RecommendationFormCard
          users={usersQuery.data?.content ?? []}
          editingRecommendation={editingRecommendation}
          onCancel={() => setEditingRecommendation(null)}
          onSaved={() => {
            setEditingRecommendation(null);
            void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
          }}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Filter by account and optional profile reference.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="recommendationFilterUser">Account</Label>
              <Select
                id="recommendationFilterUser"
                value={draftFilters.userId}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, userId: event.target.value }))
                }
              >
                <option value="">All accounts</option>
                {usersQuery.data?.content.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} · {user.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recommendationFilterProfile">Health profile</Label>
              <Select
                id="recommendationFilterProfile"
                value={draftFilters.patientProfileId}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    patientProfileId: event.target.value,
                  }))
                }
                disabled={!draftFilters.userId}
              >
                <option value="">All profiles</option>
                {profileOptionForUser(usersQuery.data?.content ?? [], Number(draftFilters.userId))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftFilters({ userId: "", patientProfileId: "" });
                  setFilterError(null);
                  setFilters({});
                }}
              >
                Reset
              </Button>
            </div>
          </form>

          {filterError && <p className="text-sm text-red-700">{filterError}</p>}
          {recommendationsQuery.isError && <ErrorMessage error={recommendationsQuery.error} />}
          {dismissMutation.isError && <ErrorMessage error={dismissMutation.error} />}

          {recommendationsQuery.isLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          )}

          {!recommendationsQuery.isLoading && recommendations.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No recommendations matched the current filters.
            </p>
          )}

          {recommendations.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Recommendation</th>
                    <th className="px-3 py-2 font-medium">Account/Profile</th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Dates</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {recommendations.map((recommendation) => {
                    const product = productsById.get(recommendation.productId);
                    const isActive = recommendation.status === "ACTIVE";
                    return (
                      <tr key={recommendation.id}>
                        <td className="px-3 py-2 font-medium text-slate-900">#{recommendation.id}</td>
                        <td className="px-3 py-2 text-slate-600">
                          Account {accountLabel(usersQuery.data?.content ?? [], recommendation.userId)}
                          <br />
                          {recommendation.patientProfileId
                            ? "Health profile selected"
                            : "No profile"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {product?.name ?? "Product details loading"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {RECOMMENDATION_TYPE_LABELS[recommendation.recommendationType]}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatRecommendationScore(recommendation.score)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={recommendationStatusVariant(recommendation.status)}>
                            {RECOMMENDATION_STATUS_LABELS[recommendation.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          <p>Generated: {formatInstant(recommendation.generatedAt)}</p>
                          <p>Expires: {formatInstant(recommendation.expiresAt)}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!isActive}
                              onClick={() => setEditingRecommendation(recommendation)}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!isActive || dismissMutation.isPending}
                              onClick={() => dismissMutation.mutate(recommendation.id)}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Dismiss
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GenerateRecommendationsCard({ users }: { users: UserDTO[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const productsQuery = useQuery({
    queryKey: ["products", "recommendation-admin-selector"],
    queryFn: () => getProducts({ page: 0, size: 75, sort: "name,asc" }),
    staleTime: 60_000,
  });
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      userId: 0,
      patientProfileId: "",
      recommendationType: "FOR_YOU",
      seedProductId: "",
      symptomIds: "",
      limit: 10,
      expiresAt: "",
    },
  });

  const recommendationType = useWatch({ control: form.control, name: "recommendationType" });
  const selectedUserId = useWatch({ control: form.control, name: "userId" });
  const selectedPatientProfileId = useWatch({ control: form.control, name: "patientProfileId" });
  const selectedSeedProductId = useWatch({ control: form.control, name: "seedProductId" });
  useEffect(() => {
    if (users.length > 0 && !form.getValues("userId")) {
      form.setValue("userId", users[0].id, { shouldValidate: true });
    }
  }, [form, users]);
  const mutation = useMutation({
    mutationFn: (values: GenerateFormValues) =>
      generateRecommendations({
        userId: values.userId,
        patientProfileId: optionalNumber(values.patientProfileId),
        recommendationType: values.recommendationType,
        seedProductId: optionalNumber(values.seedProductId),
        symptomIds: values.symptomIds
          ? values.symptomIds.split(",").map((id) => Number(id.trim()))
          : undefined,
        limit: values.limit,
        expiresAt: values.expiresAt ? toBackendLocalDateTime(values.expiresAt) : undefined,
      }),
    onSuccess: (items) => {
      setGeneratedCount(items.length);
      toast.success(`Generated or refreshed ${items.length} recommendation${items.length === 1 ? "" : "s"}.`);
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
    meta: { errorMessage: "Could not save recommendation. Check the form and try again." },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate recommendations</CardTitle>
        <CardDescription>Choose an account, profile, and suggestion type.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          {mutation.isError && <ErrorMessage error={mutation.error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Account" error={form.formState.errors.userId?.message}>
              <UserSelect users={users} value={selectedUserId} onChange={(id) => form.setValue("userId", id, { shouldValidate: true })} />
            </Field>
            <Field label="Health profile" error={form.formState.errors.patientProfileId?.message}>
              <ProfileSelect
                users={users}
                userId={selectedUserId}
                value={selectedPatientProfileId}
                onChange={(value) => form.setValue("patientProfileId", value, { shouldValidate: true })}
              />
            </Field>
            <Field label="Type" error={form.formState.errors.recommendationType?.message}>
              <Select {...form.register("recommendationType")}>
                {SUPPORTED_GENERATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {RECOMMENDATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Limit" error={form.formState.errors.limit?.message}>
              <Input type="number" min="1" max="50" {...form.register("limit", { valueAsNumber: true })} />
            </Field>
            {recommendationType !== "FOR_YOU" && (
              <Field label="Seed product" error={form.formState.errors.seedProductId?.message}>
                <ProductSelect
                  products={productsQuery.data?.content ?? []}
                  loading={productsQuery.isLoading}
                  error={productsQuery.error}
                  value={selectedSeedProductId}
                  onChange={(value) => form.setValue("seedProductId", value, { shouldValidate: true })}
                />
              </Field>
            )}
            {recommendationType === "FOR_YOU" && (
              <Field label="Symptom references" error={form.formState.errors.symptomIds?.message}>
                <Input placeholder="e.g. 1, 2, 3" {...form.register("symptomIds")} />
              </Field>
            )}
            <Field label="Expires at" error={form.formState.errors.expiresAt?.message}>
              <Input type="datetime-local" {...form.register("expiresAt")} />
            </Field>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </form>
        {generatedCount !== null && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Generated or refreshed {generatedCount} recommendation{generatedCount === 1 ? "" : "s"}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationFormCard({
  users,
  editingRecommendation,
  onCancel,
  onSaved,
}: {
  users: UserDTO[];
  editingRecommendation: RecommendationDTO | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingRecommendation !== null;
  const toast = useToast();
  const productsQuery = useQuery({
    queryKey: ["products", "recommendation-form-selector"],
    queryFn: () => getProducts({ page: 0, size: 75, sort: "name,asc" }),
    staleTime: 60_000,
  });
  const form = useForm<RecommendationFormValues>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: emptyRecommendationForm(),
  });
  const selectedUserId = useWatch({ control: form.control, name: "userId" });
  const selectedPatientProfileId = useWatch({ control: form.control, name: "patientProfileId" });
  const selectedProductId = useWatch({ control: form.control, name: "productId" });

  useEffect(() => {
    if (!editingRecommendation && users.length > 0 && !form.getValues("userId")) {
      form.setValue("userId", users[0].id, { shouldValidate: true });
    }
  }, [editingRecommendation, form, users]);

  useEffect(() => {
    if (!editingRecommendation) {
      form.reset(emptyRecommendationForm());
      return;
    }
    form.reset({
      userId: editingRecommendation.userId,
      patientProfileId: editingRecommendation.patientProfileId?.toString() ?? "",
      productId: editingRecommendation.productId,
      recommendationType: editingRecommendation.recommendationType,
      score: editingRecommendation.score?.toString() ?? "",
      reasonText: editingRecommendation.reasonText ?? "",
      expiresAt: "",
    });
  }, [editingRecommendation, form]);

  const mutation = useMutation({
    mutationFn: (values: RecommendationFormValues) => {
      const payload: RecommendationPayload = {
        userId: values.userId,
        patientProfileId: optionalNumber(values.patientProfileId),
        productId: values.productId,
        recommendationType: values.recommendationType,
        score: values.score === "" ? undefined : Number(values.score),
        reasonText: values.reasonText || undefined,
        expiresAt: values.expiresAt ? toBackendLocalDateTime(values.expiresAt) : undefined,
      };
      return editingRecommendation
        ? updateRecommendation(editingRecommendation.id, payload)
        : createRecommendation(payload);
    },
    onSuccess: () => {
      form.reset(emptyRecommendationForm());
      toast.success(editingRecommendation ? "Recommendation updated." : "Recommendation created.");
      onSaved();
    },
    meta: { errorMessage: "Could not save recommendation. Check the form and try again." },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit recommendation" : "Create recommendation"}</CardTitle>
        <CardDescription>
          Add a product suggestion for a selected account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          {mutation.isError && <ErrorMessage error={mutation.error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Account" error={form.formState.errors.userId?.message}>
              <UserSelect users={users} value={selectedUserId} onChange={(id) => form.setValue("userId", id, { shouldValidate: true })} />
            </Field>
            <Field label="Health profile" error={form.formState.errors.patientProfileId?.message}>
              <ProfileSelect
                users={users}
                userId={selectedUserId}
                value={selectedPatientProfileId}
                onChange={(value) => form.setValue("patientProfileId", value, { shouldValidate: true })}
              />
            </Field>
            <Field label="Product" error={form.formState.errors.productId?.message}>
              <ProductSelect
                products={productsQuery.data?.content ?? []}
                loading={productsQuery.isLoading}
                error={productsQuery.error}
                value={selectedProductId ? String(selectedProductId) : ""}
                onChange={(value) =>
                  form.setValue("productId", value ? Number(value) : 0, { shouldValidate: true })
                }
              />
            </Field>
            <Field label="Type" error={form.formState.errors.recommendationType?.message}>
              <Select {...form.register("recommendationType")}>
                {ALL_RECOMMENDATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {RECOMMENDATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Score" error={form.formState.errors.score?.message}>
              <Input type="number" min="0" max="1" step="0.01" {...form.register("score")} />
            </Field>
            <Field label="Expires at" error={form.formState.errors.expiresAt?.message}>
              <Input type="datetime-local" {...form.register("expiresAt")} />
            </Field>
          </div>
          <Field label="Reason" error={form.formState.errors.reasonText?.message}>
            <Input maxLength={500} {...form.register("reasonText")} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create"}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

function UserSelect({
  users,
  value,
  onChange,
}: {
  users: UserDTO[];
  value?: number;
  onChange: (id: number) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(normalized)
    );
  }, [query, users]);

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Search by name or email"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={users.length === 0}
      />
      <Select
        value={value ? String(value) : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={users.length === 0}
      >
        <option value="">Select an account</option>
        {filteredUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.firstName} {user.lastName} · {user.email}
          </option>
        ))}
      </Select>
      {users.length === 0 && <p className="text-xs text-slate-500">No accounts loaded.</p>}
      {users.length > 0 && filteredUsers.length === 0 && (
        <p className="text-xs text-slate-500">No accounts match your search.</p>
      )}
    </div>
  );
}

function ProfileSelect({
  users,
  userId,
  value,
  onChange,
}: {
  users: UserDTO[];
  userId?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const user = users.find((item) => item.id === userId);
  const profileId = user?.patientProfile?.id;

  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={!userId}>
      <option value="">No health profile</option>
      {profileId && (
        <option value={profileId}>
          {user.firstName} {user.lastName} health profile
        </option>
      )}
    </Select>
  );
}

function ProductSelect({
  products,
  loading,
  error,
  value,
  onChange,
}: {
  products: ProductDTO[];
  loading: boolean;
  error: unknown;
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter((product) =>
      [
        product.name,
        product.category?.name,
        product.productType,
        product.barcode,
        product.brandName,
        product.manufacturer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [products, query]);

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Search by product, category, type, or barcode"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={loading}
      />
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || products.length === 0}
      >
        <option value="">{loading ? "Loading products..." : "Select a product"}</option>
        {filteredProducts.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} · {product.category?.name ?? product.productType ?? "Catalog"} ·{" "}
            {formatProductPrice(product)}
          </option>
        ))}
      </Select>
      {Boolean(error) && <p className="text-xs text-red-700">Could not load product options.</p>}
      {!loading && !error && products.length === 0 && (
        <p className="text-xs text-slate-500">No products are available to select.</p>
      )}
      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <p className="text-xs text-slate-500">No products match your search.</p>
      )}
    </div>
  );
}

function accountLabel(users: UserDTO[], userId: number): string {
  const user = users.find((item) => item.id === userId);
  if (!user) return "not loaded";
  return `${user.firstName} ${user.lastName}`;
}

function profileOptionForUser(users: UserDTO[], userId: number) {
  const user = users.find((item) => item.id === userId);
  const profileId = user?.patientProfile?.id;
  if (!profileId) return null;
  return (
    <option value={profileId}>
      {user.firstName} {user.lastName} health profile
    </option>
  );
}

function formatProductPrice(product: ProductDTO) {
  return Number.isFinite(product.price) ? `${product.price.toFixed(2)} KM` : "Price unavailable";
}

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

function emptyRecommendationForm(): RecommendationFormValues {
  return {
    userId: 0,
    patientProfileId: "",
    productId: 0,
    recommendationType: "FOR_YOU",
    score: "",
    reasonText: "",
    expiresAt: "",
  };
}
