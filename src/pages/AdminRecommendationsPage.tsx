import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { getProductById } from "@/api/products";
import {
  createRecommendation,
  generateRecommendations,
  getRecommendations,
  logRecommendationInteraction,
  updateRecommendation,
} from "@/api/recommendations";
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
import type {
  ProductDTO,
  RecommendationDTO,
  RecommendationPayload,
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
    userId: z.number({ error: "User id is required" }).int().positive(),
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
      message: "Symptom ids must be comma-separated positive whole numbers",
    }
  );

const recommendationSchema = z.object({
  userId: z.number({ error: "User id is required" }).int().positive(),
  patientProfileId: optionalPositiveInt,
  productId: z.number({ error: "Product id is required" }).int().positive(),
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
  const [filters, setFilters] = useState<{ userId?: number; patientProfileId?: number }>({});
  const [draftFilters, setDraftFilters] = useState({ userId: "", patientProfileId: "" });
  const [filterError, setFilterError] = useState<string | null>(null);
  const [editingRecommendation, setEditingRecommendation] = useState<RecommendationDTO | null>(null);

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", "admin", filters],
    queryFn: () => getRecommendations(filters),
    placeholderData: keepPreviousData,
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
      setFilterError("Filter ids must be positive whole numbers.");
      return;
    }
    setFilterError(null);
    setFilters({ userId, patientProfileId });
  };

  const dismissMutation = useMutation({
    mutationFn: (id: number) => logRecommendationInteraction(id, "DISMISSED"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
          <Sparkles className="h-6 w-6 text-brand-600" />
          Recommendation management
        </h1>
        <p className="mt-1 text-slate-600">
          Generate, review, and maintain smart-features product recommendations.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GenerateRecommendationsCard />
        <RecommendationFormCard
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
          <CardTitle>Existing recommendations</CardTitle>
          <CardDescription>Filter by backend-supported user and patient profile ids.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="recommendationFilterUser">User id</Label>
              <Input
                id="recommendationFilterUser"
                type="number"
                min="1"
                value={draftFilters.userId}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, userId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recommendationFilterProfile">Patient profile id</Label>
              <Input
                id="recommendationFilterProfile"
                type="number"
                min="1"
                value={draftFilters.patientProfileId}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    patientProfileId: event.target.value,
                  }))
                }
              />
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
                    <th className="px-3 py-2 font-medium">User/Profile</th>
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
                          User #{recommendation.userId}
                          <br />
                          {recommendation.patientProfileId
                            ? `Profile #${recommendation.patientProfileId}`
                            : "No profile"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {product?.name ?? `Product #${recommendation.productId}`}
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

function GenerateRecommendationsCard() {
  const queryClient = useQueryClient();
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      userId: 2,
      patientProfileId: "",
      recommendationType: "FOR_YOU",
      seedProductId: "",
      symptomIds: "",
      limit: 10,
      expiresAt: "",
    },
  });

  const recommendationType = useWatch({ control: form.control, name: "recommendationType" });
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
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate recommendations</CardTitle>
        <CardDescription>Uses backend-supported generation strategies only.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          {mutation.isError && <ErrorMessage error={mutation.error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="User id" error={form.formState.errors.userId?.message}>
              <Input type="number" min="1" {...form.register("userId", { valueAsNumber: true })} />
            </Field>
            <Field label="Patient profile id" error={form.formState.errors.patientProfileId?.message}>
              <Input type="number" min="1" {...form.register("patientProfileId")} />
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
              <Field label="Seed product id" error={form.formState.errors.seedProductId?.message}>
                <Input type="number" min="1" {...form.register("seedProductId")} />
              </Field>
            )}
            {recommendationType === "FOR_YOU" && (
              <Field label="Symptom ids" error={form.formState.errors.symptomIds?.message}>
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
  editingRecommendation,
  onCancel,
  onSaved,
}: {
  editingRecommendation: RecommendationDTO | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingRecommendation !== null;
  const form = useForm<RecommendationFormValues>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: emptyRecommendationForm(),
  });

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
      onSaved();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit recommendation" : "Create recommendation"}</CardTitle>
        <CardDescription>
          Manual records are validated by the smart-features recommendation API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          {mutation.isError && <ErrorMessage error={mutation.error} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="User id" error={form.formState.errors.userId?.message}>
              <Input type="number" min="1" {...form.register("userId", { valueAsNumber: true })} />
            </Field>
            <Field label="Patient profile id" error={form.formState.errors.patientProfileId?.message}>
              <Input type="number" min="1" {...form.register("patientProfileId")} />
            </Field>
            <Field label="Product id" error={form.formState.errors.productId?.message}>
              <Input type="number" min="1" {...form.register("productId", { valueAsNumber: true })} />
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

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

function emptyRecommendationForm(): RecommendationFormValues {
  return {
    userId: 2,
    patientProfileId: "",
    productId: 1,
    recommendationType: "FOR_YOU",
    score: "",
    reasonText: "",
    expiresAt: "",
  };
}
