import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Clock, Mail, MapPin, Phone, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { createPharmacy, getPharmacies, type PharmacyQuery } from "@/api/pharmacies";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { PharmacyFormFields } from "@/components/PharmacyFormFields";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { getPharmacyImage } from "@/lib/catalog";
import { pharmacySchema, type PharmacyFormValues } from "@/lib/pharmacySchema";
import { useToast } from "@/toast/useToast";

export function PharmaciesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { hasRole } = useAuth();
  const isStaff = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<PharmacyQuery>({});
  const [draft, setDraft] = useState<PharmacyQuery>({});
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ["pharmacies", { page, ...filters }],
    queryFn: () => getPharmacies({ page, size: 9, sort: "name,asc", ...filters }),
    placeholderData: keepPreviousData,
  });

  const createForm = useForm<PharmacyFormValues>({ resolver: zodResolver(pharmacySchema) });

  const createMutation = useMutation({
    mutationFn: (values: PharmacyFormValues) => createPharmacy(values),
    onSuccess: (pharmacy) => {
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      setCreateOpen(false);
      createForm.reset();
      toast.success(`Pharmacy "${pharmacy.name}" created.`);
    },
    onError: () => {
      toast.error("Could not create the pharmacy.");
    },
  });

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
    setPage(0);
  };

  const clearFilters = () => {
    setDraft({});
    setFilters({});
    setPage(0);
  };

  return (
    <div className="space-y-8 animate-section">
      <section className="relative overflow-hidden rounded-[2rem] border border-brand-100 bg-[radial-gradient(circle_at_85%_20%,rgba(14,165,233,0.18),transparent_26%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_55%,#eaf8ff_100%)] p-7 shadow-sm lg:p-8">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-brand-200/30 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
            Pharmacy directory
          </p>
          <h1 className="mt-4 flex items-center gap-3 text-4xl font-extrabold tracking-tight text-ink-800">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
              <Building2 className="h-6 w-6" />
            </span>
            Pharmacies
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Browse partner pharmacies, opening hours, contact information, and available inventory.
          </p>
          {isStaff && (
            <Button
              type="button"
              className="mt-6 rounded-2xl"
              onClick={() => {
                createForm.reset();
                setCreateOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New pharmacy
            </Button>
          )}
        </div>
      </section>

      <form
        onSubmit={applyFilters}
        className="grid grid-cols-1 gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1.3fr_1fr_auto] sm:items-end lg:p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="filterName">Name contains</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="filterName"
              className="rounded-xl pl-9 shadow-sm"
              placeholder="e.g. Centar"
              value={draft.name ?? ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value || undefined })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filterCity">City</Label>
          <Input
            id="filterCity"
            className="rounded-xl shadow-sm"
            placeholder="e.g. Sarajevo"
            value={draft.city ?? ""}
            onChange={(e) => setDraft({ ...draft, city: e.target.value || undefined })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>Reset</Button>
        </div>
      </form>

      {query.isError && <ErrorMessage error={query.error} />}
      {query.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-96 rounded-[1.75rem] skeleton-shimmer" />
          ))}
        </div>
      )}

      {query.data && query.data.content.length === 0 && (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-4 font-extrabold text-ink-800">No pharmacies match these filters</p>
          <p className="mt-2 text-sm text-slate-500">Try a different name or city.</p>
          <Button type="button" className="mt-6 rounded-xl" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {query.data && query.data.content.length > 0 && (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.content.map((pharmacy) => (
              <Link
                key={pharmacy.id}
                to={`/pharmacies/${pharmacy.id}`}
                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm hover-lift hover:border-brand-200 hover:shadow-lg"
              >
                <img
                  src={getPharmacyImage(pharmacy.imageUrl)}
                  alt={pharmacy.name}
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-3 p-5">
                  <h2 className="text-xl font-extrabold text-ink-800 group-hover:text-brand-700">
                    {pharmacy.name}
                  </h2>
                  <p className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {pharmacy.address}, {pharmacy.city}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {pharmacy.phoneNumber}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {pharmacy.email}
                  </p>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {pharmacy.openingHours}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-600">
              Page {query.data.number + 1} of {Math.max(1, query.data.totalPages)} ·{" "}
              {query.data.totalElements} pharmac{query.data.totalElements === 1 ? "y" : "ies"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New pharmacy">
        <form
          className="space-y-4"
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
          noValidate
        >
          <PharmacyFormFields form={createForm} />
          <ErrorMessage error={createMutation.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create pharmacy"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
