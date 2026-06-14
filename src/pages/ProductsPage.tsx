import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Filter, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProductInventorySummary } from "@/api/pharmacies";
import { getCategories, getProducts, type ProductQuery } from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";

interface FilterDraft {
  name: string;
  categoryId: string;
  productType: string;
  requiresPrescription: string;
  minPrice: string;
  maxPrice: string;
  inStock: string;
}

export function ProductsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "0");
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const currentDraft = useMemo(() => draftFromSearchParams(searchParams), [searchParams]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const products = useQuery({
    queryKey: ["products", { page, ...filters }],
    queryFn: () => getProducts({ page, size: 9, sort: "name,asc", ...filters }),
    placeholderData: keepPreviousData,
  });

  const productIds = products.data?.content.map((product) => product.id) ?? [];
  const summaries = useQuery({
    queryKey: ["inventory", "product-summary", productIds],
    queryFn: () => getProductInventorySummary(productIds),
    enabled: productIds.length > 0,
  });

  const summariesByProduct = new Map(
    summaries.data?.map((summary) => [summary.productId, summary]) ?? []
  );
  const visibleProducts = (products.data?.content ?? []).filter((product) => {
    if (filters.inStock !== true) return true;
    return summariesByProduct.get(product.id)?.inStock === true;
  });

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const draft = {
      name: String(formData.get("name") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      productType: String(formData.get("productType") ?? ""),
      requiresPrescription: String(formData.get("requiresPrescription") ?? ""),
      minPrice: String(formData.get("minPrice") ?? ""),
      maxPrice: String(formData.get("maxPrice") ?? ""),
      inStock: formData.get("inStock") === "true" ? "true" : "",
    };
    const minPrice = draft.minPrice ? Number(draft.minPrice) : null;
    const maxPrice = draft.maxPrice ? Number(draft.maxPrice) : null;
    if (
      minPrice !== null &&
      maxPrice !== null &&
      Number.isFinite(minPrice) &&
      Number.isFinite(maxPrice) &&
      maxPrice < minPrice
    ) {
      setFilterError("Max price must be greater than or equal to min price.");
      return;
    }
    setFilterError(null);
    const next = new URLSearchParams();
    if (draft.name.trim()) next.set("name", draft.name.trim());
    if (draft.categoryId) next.set("categoryId", draft.categoryId);
    if (draft.productType) next.set("productType", draft.productType);
    if (draft.requiresPrescription) next.set("requiresPrescription", draft.requiresPrescription);
    if (draft.minPrice) next.set("minPrice", draft.minPrice);
    if (draft.maxPrice) next.set("maxPrice", draft.maxPrice);
    if (draft.inStock) next.set("inStock", draft.inStock);
    setSearchParams(next);
  };

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 0) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
  };

  const clearFilters = () => {
    setFilterError(null);
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="space-y-8">
      {canWrite ? (
        <AdminPageHeader
          eyebrow="Catalog operations"
          title="Product catalog"
          description="Manage product details, pricing, and availability."
          icon={Package}
          stats={[
            { label: "Products", value: products.data?.totalElements ?? "..." },
            { label: "Visible on page", value: visibleProducts.length },
            { label: "Categories", value: categories.data?.length ?? "..." },
          ]}
          action={
            <Link
              to="/products/new"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100 hover:bg-brand-50"
            >
              Add product
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4 rounded-[2rem] border border-brand-100 bg-[radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] p-7 shadow-sm sm:flex-row sm:items-end sm:justify-between lg:p-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-ink-800">
              Products{products.data ? ` (${products.data.totalElements})` : ""}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Browse medicines, supplements, first-aid products, and pharmacy care essentials.
            </p>
          </div>
        </div>
      )}

      <div className="lg:hidden">
        <Button type="button" variant="outline" onClick={() => setFiltersOpen((open) => !open)}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <form
          key={searchParams.toString()}
          onSubmit={applyFilters}
          className={`${filtersOpen ? "block" : "hidden"} h-fit rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm lg:block lg:p-6`}
        >
          <div className="border-b border-slate-200 pb-5">
            <h2 className="flex items-center justify-between text-lg font-extrabold text-ink-800">
              Filters <Filter className="h-4 w-4" />
            </h2>
          </div>

          {filterError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {filterError}
            </div>
          )}
          {categories.isError && <ErrorMessage error={categories.error} className="mt-4" />}

          <div className="border-b border-slate-200 py-5">
            <Label htmlFor="filterName">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="filterName"
                name="name"
                className="h-10 rounded-xl pl-9 shadow-sm"
                placeholder="Brufen, vitamin, cough..."
                defaultValue={currentDraft.name}
              />
            </div>
          </div>

          <div className="border-b border-slate-200 py-5">
            <Label htmlFor="filterCategory" className="text-base font-extrabold text-ink-800">Category</Label>
            <Select
              id="filterCategory"
              name="categoryId"
              defaultValue={currentDraft.categoryId}
            >
              <option value="">All categories</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </div>

          <div className="border-b border-slate-200 py-5">
            <Label htmlFor="filterType" className="text-base font-extrabold text-ink-800">Product type</Label>
            <Select
              id="filterType"
              name="productType"
              defaultValue={currentDraft.productType}
            >
              <option value="">All types</option>
              <option value="MEDICATION">Medication</option>
              <option value="SUPPLEMENT">Supplement</option>
              <option value="COSMETIC">Cosmetic</option>
              <option value="MEDICAL_DEVICE">Medical device</option>
            </Select>
          </div>

          <div className="border-b border-slate-200 py-5">
            <Label htmlFor="filterRx" className="text-base font-extrabold text-ink-800">Prescription</Label>
            <Select
              id="filterRx"
              name="requiresPrescription"
              defaultValue={currentDraft.requiresPrescription}
            >
              <option value="">All</option>
              <option value="false">OTC only</option>
              <option value="true">Rx only</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 border-b border-slate-200 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="minPrice" className="font-bold text-ink-800">Min price</Label>
              <Input
                id="minPrice"
                name="minPrice"
                type="number"
                min={0}
                step="0.01"
                className="rounded-xl shadow-sm"
                defaultValue={currentDraft.minPrice}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxPrice" className="font-bold text-ink-800">Max price</Label>
              <Input
                id="maxPrice"
                name="maxPrice"
                type="number"
                min={0}
                step="0.01"
                className="rounded-xl shadow-sm"
                defaultValue={currentDraft.maxPrice}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 border-b border-slate-200 py-5 text-sm font-bold text-ink-800">
            <input
              type="checkbox"
              name="inStock"
              value="true"
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
              defaultChecked={currentDraft.inStock === "true"}
            />
            In stock only
          </label>

          <div className="flex gap-2 pt-5">
            <Button type="submit">Apply</Button>
            <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
          </div>
        </form>

        <section className="min-w-0">
          {products.isError && <ErrorMessage error={products.error} />}

          {(products.isLoading || products.isFetching) && !products.data && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-96 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          )}

          {products.data && visibleProducts.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <p className="font-medium text-slate-900">No products match these filters</p>
              <p className="mt-1 text-sm text-slate-500">Clear filters or broaden your search.</p>
              <Button type="button" className="mt-5" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}

          {products.data && visibleProducts.length > 0 && (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                <span className="font-medium">{products.data.totalElements} products found</span>
                {products.isFetching && <span>Refreshing...</span>}
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    summary={summariesByProduct.get(product.id)}
                  />
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between text-sm">
                <p className="text-slate-600">
                  Page {products.data.number + 1} of {Math.max(1, products.data.totalPages)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={products.data.first}
                    onClick={() => setPage(Math.max(0, products.data.number - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={products.data.last}
                    onClick={() => setPage(products.data.number + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function filtersFromSearchParams(searchParams: URLSearchParams): ProductQuery & { inStock?: boolean } {
  const filters: ProductQuery & { inStock?: boolean } = {};
  const name = searchParams.get("name");
  const categoryId = Number(searchParams.get("categoryId"));
  const productType = searchParams.get("productType");
  const requiresPrescription = searchParams.get("requiresPrescription");
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const inStock = searchParams.get("inStock");

  if (name) filters.name = name;
  if (Number.isFinite(categoryId) && categoryId > 0) filters.categoryId = categoryId;
  if (productType) filters.productType = productType;
  if (requiresPrescription === "true" || requiresPrescription === "false") {
    filters.requiresPrescription = requiresPrescription === "true";
  }
  if (minPriceParam) {
    const minPrice = Number(minPriceParam);
    if (Number.isFinite(minPrice) && minPrice >= 0) filters.minPrice = minPrice;
  }
  if (maxPriceParam) {
    const maxPrice = Number(maxPriceParam);
    if (Number.isFinite(maxPrice) && maxPrice >= 0) filters.maxPrice = maxPrice;
  }
  if (inStock === "true") filters.inStock = true;
  return filters;
}

function draftFromSearchParams(searchParams: URLSearchParams): FilterDraft {
  return {
    name: searchParams.get("name") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    productType: searchParams.get("productType") ?? "",
    requiresPrescription: searchParams.get("requiresPrescription") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    inStock: searchParams.get("inStock") ?? "",
  };
}
