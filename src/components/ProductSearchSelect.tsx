import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getProducts } from "@/api/products";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { ProductDTO } from "@/types/api";

interface Props {
  selectedProduct: ProductDTO | null;
  onSelect: (product: ProductDTO) => void;
  onClear: () => void;
  error?: string;
}

const MIN_CHARS = 2;

/**
 * Type-ahead product picker. Searches the product catalogue by name (partial
 * match) once the user types {@link MIN_CHARS}+ characters and reports the
 * chosen product up — so callers store a productId without anyone memorising it.
 */
export function ProductSearchSelect({ selectedProduct, onSelect, onClear, error }: Props) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const enabled = debounced.length >= MIN_CHARS;
  const search = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () => getProducts({ name: debounced, size: 8, sort: "name,asc" }),
    enabled,
    staleTime: 60_000,
  });

  const results = search.data?.content ?? [];

  if (selectedProduct) {
    return (
      <div className="space-y-1.5">
        <Label>Product</Label>
        <div className="flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-medium text-slate-900">{selectedProduct.name}</span>
          <button
            type="button"
            className="text-xs font-medium text-brand-700 hover:underline"
            onClick={() => {
              setTerm("");
              setDebounced("");
              onClear();
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="inv-product-search">Product</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="inv-product-search"
          className="pl-9"
          autoComplete="off"
          placeholder="Search by name (type 2+ letters)…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {enabled && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {search.isLoading && (
              <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
            )}
            {!search.isLoading && results.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">No products match “{debounced}”.</p>
            )}
            {results.map((p) => (
              <button
                type="button"
                key={p.id}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => {
                  onSelect(p);
                  setTerm("");
                  setDebounced("");
                }}
              >
                <span className="font-medium text-slate-900">{p.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {p.manufacturer ? p.manufacturer : `#${p.id}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
