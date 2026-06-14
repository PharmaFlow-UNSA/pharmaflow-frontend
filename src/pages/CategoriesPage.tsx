import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createCategory, deleteCategory, getCategories } from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { AdminPageHeader, EmptyState } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/toast/useToast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CategoriesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const canDelete = hasRole("ROLE_ADMIN");
  const qc = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      reset();
      toast.success("Category created.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted.");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="space-y-7 animate-section">
      <AdminPageHeader
        eyebrow="Catalog operations"
        title="Categories"
        description="Maintain the product taxonomy used by catalog, inventory, and storefront filters."
        icon={Package}
        stats={[{ label: "Categories", value: query.data?.length ?? "..." }]}
        action={
          canWrite ? (
            <span className="inline-flex items-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15">
              <Plus className="mr-2 h-4 w-4" />
              Create category below
            </span>
          ) : undefined
        }
      />

      {/* Create form — visible to pharmacist/admin */}
      {canWrite && (
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          className="flex flex-wrap items-start gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="catName">Category name *</Label>
            <Input
              id="catName"
              className="w-52"
              placeholder="e.g. Antibiotics"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5 min-h-[72px]">
            <Label htmlFor="catDesc">Description</Label>
            <Input
              id="catDesc"
              className="w-64"
              placeholder="Optional"
              {...register("description")}
            />
          </div>
          <div className="flex items-start pt-6 min-h-[72px]">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add category"}
            </Button>
          </div>
          {createMutation.isError && (
            <ErrorMessage error={createMutation.error} className="w-full" />
          )}
        </form>
      )}

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && <div className="h-48 rounded-[1.75rem] skeleton-shimmer" />}

      {query.data && query.data.length === 0 && (
        <EmptyState
          title="No categories yet"
          description="Create the first category so products can be grouped and filtered properly."
          icon={Package}
        />
      )}

      {query.data && query.data.length > 0 && (
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Description
                </th>
                {canDelete && (
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {query.data.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 text-slate-400">{c.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.description ?? "—"}
                  </td>
                  {canDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete category "${c.name}"?`))
                            deleteMutation.mutate(c.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
