import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { createFaqEntry, deleteFaqEntry, getFaqEntriesPage, updateFaqEntry } from "@/api/faqs";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { FaqCategory, FaqEntryDTO, FaqEntryPayload } from "@/types/api";

const FAQ_CATEGORIES: FaqCategory[] = ["ORDERS", "PRESCRIPTIONS", "DELIVERY", "PAYMENTS", "ACCOUNT"];

const categoryLabel: Record<FaqCategory, string> = {
  ORDERS: "Orders",
  PRESCRIPTIONS: "Prescriptions",
  DELIVERY: "Delivery",
  PAYMENTS: "Payments",
  ACCOUNT: "Account",
};

const emptyForm: FaqFormValues = {
  question: "",
  answer: "",
  category: "ORDERS",
  keywords: "",
  isActive: true,
};

interface FaqFormValues {
  question: string;
  answer: string;
  category: FaqCategory;
  keywords: string;
  isActive: boolean;
}

export function AdminFaqsPage() {
  const [editingFaq, setEditingFaq] = useState<FaqEntryDTO | null>(null);
  const [formValues, setFormValues] = useState<FaqFormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FaqCategory | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const faqsQuery = useQuery({
    queryKey: ["faqs", "admin", page, pageSize],
    queryFn: () => getFaqEntriesPage({ page, size: pageSize }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: FaqEntryPayload) =>
      editingFaq ? updateFaqEntry(editingFaq.id, payload) : createFaqEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaqEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faqs"] }),
  });

  const filteredFaqs = useMemo(() => {
    return (faqsQuery.data?.content ?? []).filter((faq) => {
      const categoryMatch = categoryFilter === "ALL" || faq.category === categoryFilter;
      const activeMatch =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && faq.isActive) ||
        (activeFilter === "INACTIVE" && !faq.isActive);
      return categoryMatch && activeMatch;
    });
  }, [activeFilter, categoryFilter, faqsQuery.data?.content]);

  const pageData = faqsQuery.data;

  const resetForm = () => {
    setEditingFaq(null);
    setFormValues(emptyForm);
    setFormError(null);
  };

  const startEditing = (faq: FaqEntryDTO) => {
    setEditingFaq(faq);
    setFormValues({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      keywords: faq.keywords ?? "",
      isActive: faq.isActive,
    });
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload(formValues);
    const validationError = validateFaqPayload(payload);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    saveMutation.mutate(payload);
  };

  const handleDelete = (faq: FaqEntryDTO) => {
    if (!window.confirm(`Delete FAQ "${faq.question}"?`)) return;
    deleteMutation.mutate(faq.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">FAQ management</h1>
        <p className="mt-1 text-slate-600">
          Create and maintain the support answers used by the FAQ page and assistant.
        </p>
      </div>

      {(faqsQuery.isError || saveMutation.isError || deleteMutation.isError) && (
        <ErrorMessage error={faqsQuery.error ?? saveMutation.error ?? deleteMutation.error} />
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <Card>
          <CardHeader>
            <CardTitle>FAQ entries</CardTitle>
            <CardDescription>Filter, edit, activate, or remove support FAQ content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as FaqCategory | "ALL")}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="ALL">All categories</option>
                {FAQ_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel[category]}
                  </option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(event) =>
                  setActiveFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {faqsQuery.isLoading && <p className="text-sm text-slate-500">Loading FAQs...</p>}
            {!faqsQuery.isLoading && filteredFaqs.length === 0 && (
              <p className="text-sm text-slate-600">No FAQ entries match the current filters.</p>
            )}
            {filteredFaqs.length > 0 && (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Question</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Updated</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredFaqs.map((faq) => (
                      <tr key={faq.id}>
                        <td className="max-w-md px-3 py-2 font-medium text-slate-900">
                          {faq.question}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="info">{categoryLabel[faq.category]}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={faq.isActive ? "success" : "outline"}>
                            {faq.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{formatDateTime(faq.updatedAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => startEditing(faq)}
                              aria-label="Edit FAQ"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              onClick={() => handleDelete(faq)}
                              disabled={deleteMutation.isPending}
                              aria-label="Delete FAQ"
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
            {pageData && (
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Page {pageData.number + 1} of {Math.max(pageData.totalPages, 1)} ·{" "}
                  {pageData.totalElements} total FAQs
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(current - 1, 0))}
                    disabled={pageData.first || faqsQuery.isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={pageData.last || faqsQuery.isFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {editingFaq ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingFaq ? "Edit FAQ" : "Create FAQ"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  value={formValues.question}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, question: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faq-answer">Answer</Label>
                <textarea
                  id="faq-answer"
                  value={formValues.answer}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, answer: event.target.value }))
                  }
                  className="min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faq-category">Category</Label>
                <select
                  id="faq-category"
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((current) => ({
                      ...current,
                      category: event.target.value as FaqCategory,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {FAQ_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faq-keywords">Keywords</Label>
                <Input
                  id="faq-keywords"
                  value={formValues.keywords}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, keywords: event.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formValues.isActive}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingFaq ? "Update FAQ" : "Create FAQ"}
                </Button>
                {editingFaq && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function toPayload(values: FaqFormValues): FaqEntryPayload {
  return {
    question: values.question.trim(),
    answer: values.answer.trim(),
    category: values.category,
    keywords: values.keywords.trim() || null,
    isActive: values.isActive,
  };
}

function validateFaqPayload(payload: FaqEntryPayload): string | null {
  if (payload.question.length < 5 || payload.question.length > 200) {
    return "Question must be between 5 and 200 characters.";
  }
  if (payload.answer.length < 5 || payload.answer.length > 2000) {
    return "Answer must be between 5 and 2000 characters.";
  }
  if (payload.keywords && payload.keywords.length > 500) {
    return "Keywords must not exceed 500 characters.";
  }
  return null;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
