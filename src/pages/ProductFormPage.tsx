import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import {
  createProduct,
  getCategories,
  getProductById,
  updateProduct,
} from "@/api/products";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/toast/useToast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  barcode: z.string().min(1, "Barcode is required"),
  brandName: z.string().optional(),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  packageSize: z.string().optional(),
  productType: z.enum(["MEDICATION", "SUPPLEMENT", "COSMETIC", "MEDICAL_DEVICE"]),
  requiresPrescription: z.boolean(),
  categoryId: z.coerce.number().int().positive("Select a category"),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || value.startsWith("/") || z.string().url().safeParse(value).success,
      "Use an absolute URL or a local path like /demo/products/example.svg"
    )
    .optional(),
});

// `z.coerce` makes the schema's input type (pre-coercion) differ from its
// output type, so useForm needs both generics: input for the field values /
// resolver, output for the submitted values.
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function ProductFormPage() {
  const { productId } = useParams();
  const isEdit = !!productId;
  const id = Number(productId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const existing = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: isEdit && Number.isFinite(id),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productType: "MEDICATION",
      requiresPrescription: false,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existing.data) {
      reset({
        name: existing.data.name,
        barcode: existing.data.barcode ?? "",
        brandName: existing.data.brandName ?? "",
        manufacturer: existing.data.manufacturer ?? "",
        description: existing.data.description ?? "",
        price: existing.data.price,
        packageSize: existing.data.packageSize ?? "",
        productType: (existing.data.productType as FormValues["productType"]) ?? "MEDICATION",
        requiresPrescription: existing.data.requiresPrescription,
        categoryId: existing.data.category?.id ?? 0,
        imageUrl: existing.data.imageUrl ?? "",
      });
    }
  }, [existing.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEdit
        ? updateProduct(id, values)
        : createProduct(values),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      if (isEdit) void qc.invalidateQueries({ queryKey: ["product", id] });
      toast.success(isEdit ? "Product updated." : "Product created.");
      navigate(`/products/${saved.id}`);
    },
    onError: () => {
      toast.error(isEdit ? "Could not update the product." : "Could not create the product.");
    },
  });

  return (
    <div>
      <Link
        to={isEdit ? `/products/${id}` : "/products"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? "Back to product" : "Back to products"}
      </Link>

      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEdit ? "Edit product" : "New product"}
      </h1>

      {existing.isLoading && <p className="text-slate-500">Loading…</p>}

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6"
      >
        {/* Row 1 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="barcode">Barcode *</Label>
            <Input id="barcode" {...register("barcode")} />
            {errors.barcode && (
              <p className="text-xs text-red-600">{errors.barcode.message}</p>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brandName">Brand name</Label>
            <Input id="brandName" {...register("brandName")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manufacturer">Manufacturer *</Label>
            <Input id="manufacturer" {...register("manufacturer")} />
            {errors.manufacturer && (
              <p className="text-xs text-red-600">{errors.manufacturer.message}</p>
            )}
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (KM) *</Label>
            <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
            {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="packageSize">Package size</Label>
            <Input id="packageSize" placeholder="e.g. 30 tablets" {...register("packageSize")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Category *</Label>
            <Select id="categoryId" {...register("categoryId")}>
              <option value="">Select…</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-red-600">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="productType">Product type *</Label>
            <Select id="productType" {...register("productType")}>
              <option value="MEDICATION">Medication</option>
              <option value="SUPPLEMENT">Supplement</option>
              <option value="COSMETIC">Cosmetic</option>
              <option value="MEDICAL_DEVICE">Medical device</option>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="rx"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
              {...register("requiresPrescription")}
            />
            <Label htmlFor="rx">Requires prescription</Label>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            placeholder="/demo/products/pain-relief.svg"
            {...register("imageUrl")}
          />
          {errors.imageUrl && (
            <p className="text-xs text-red-600">{errors.imageUrl.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={3}
            className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            {...register("description")}
          />
        </div>

        {mutation.isError && <ErrorMessage error={mutation.error} />}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : isEdit
              ? "Update product"
              : "Create product"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/products/${id}` : "/products")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
