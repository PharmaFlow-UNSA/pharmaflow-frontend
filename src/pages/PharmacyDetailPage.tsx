import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import {
  createInventory,
  deleteInventory,
  deletePharmacy,
  getInventoryForPharmacy,
  getPharmacyById,
  updateInventory,
  updatePharmacy,
} from "@/api/pharmacies";
import { getProductById } from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { PharmacyFormFields } from "@/components/PharmacyFormFields";
import { ProductSearchSelect } from "@/components/ProductSearchSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { getPharmacyImage } from "@/lib/catalog";
import { pharmacySchema, type PharmacyFormValues } from "@/lib/pharmacySchema";
import { useToast } from "@/toast/useToast";
import { showApiErrorToast, showSuccessToast } from "@/lib/errors";
import { cn, formatInstant } from "@/lib/utils";
import type { InventoryDTO, ProductDTO } from "@/types/api";

const INVENTORY_PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);

const inventorySchema = z.object({
  productId: z.number().int().positive("Product ID is required"),
  quantity: z.number().int().min(0, "Quantity must be at least 0").max(1_000_000),
  reorderLevel: z.number().int().min(0, "Reorder level must be at least 0").max(1_000_000),
});
type InventoryForm = z.infer<typeof inventorySchema>;

export function PharmacyDetailPage() {
  const { pharmacyId } = useParams();
  const id = Number(pharmacyId);
  const enabled = Number.isFinite(id) && id > 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { hasRole } = useAuth();
  const isStaff = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");
  const [inventoryPageState, setInventoryPageState] = useState({ key: "", page: 1 });
  const [editOpen, setEditOpen] = useState(false);
  const [invModal, setInvModal] = useState<{ mode: "create" | "edit"; item: InventoryDTO | null } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);

  const pharmacy = useQuery({
    queryKey: ["pharmacy", id],
    queryFn: () => getPharmacyById(id),
    enabled,
  });

  const inventory = useQuery({
    queryKey: ["inventory", "pharmacy", id],
    queryFn: () => getInventoryForPharmacy(id),
    enabled,
  });

  const productQueries = useQueries({
    queries: (inventory.data ?? []).map((item) => ({
      queryKey: ["product", item.productId],
      queryFn: () => getProductById(item.productId),
      staleTime: 60_000,
    })),
  });
  const productsById = new Map(
    productQueries
      .map((query) => query.data)
      .filter((product) => Boolean(product))
      .map((product) => [product!.id, product!])
  );
  const inventoryItems = useMemo(() => inventory.data ?? [], [inventory.data]);
  const inventoryKey = useMemo(
    () => inventoryItems.map((item) => `${item.id}:${item.quantity}:${item.reorderLevel ?? ""}`).join("|"),
    [inventoryItems]
  );
  const totalInventoryItems = inventoryItems.length;
  const totalInventoryPages = Math.max(1, Math.ceil(totalInventoryItems / INVENTORY_PAGE_SIZE));
  const requestedInventoryPage =
    inventoryPageState.key === inventoryKey ? inventoryPageState.page : 1;
  const currentInventoryPage = Math.min(requestedInventoryPage, totalInventoryPages);
  const paginatedInventory = useMemo(
    () =>
      inventoryItems.slice(
        (currentInventoryPage - 1) * INVENTORY_PAGE_SIZE,
        currentInventoryPage * INVENTORY_PAGE_SIZE
      ),
    [currentInventoryPage, inventoryItems]
  );
  const editForm = useForm<PharmacyFormValues>({ resolver: zodResolver(pharmacySchema) });
  const invForm = useForm<InventoryForm>({ resolver: zodResolver(inventorySchema) });

  const updatePharmacyMut = useMutation({
    mutationFn: (values: PharmacyFormValues) => updatePharmacy(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(["pharmacy", id], updated);
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      setEditOpen(false);
      toast.success(`Pharmacy "${updated.name}" updated.`);
    },
    onError: () => {
      toast.error("Could not update the pharmacy.");
    },
  });

  const deletePharmacyMut = useMutation({
    mutationFn: () => deletePharmacy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      toast.success("Pharmacy deleted.");
      navigate("/pharmacies", { replace: true });
    },
    onError: () => {
      toast.error("Could not delete the pharmacy.");
    },
  });

  const createInvMut = useMutation({
    mutationFn: createInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "pharmacy", id] });
      setInvModal(null);
      invForm.reset();
      setSelectedProduct(null);
      toast.success("Inventory item added.");
    },
    onError: () => {
      toast.error("Could not add the inventory item.");
    },
  });

  const updateInvMut = useMutation({
    mutationFn: ({ invId, payload }: { invId: number; payload: Parameters<typeof updateInventory>[1] }) =>
      updateInventory(invId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "pharmacy", id] });
      setInvModal(null);
      invForm.reset();
      toast.success("Inventory item updated.");
    },
    onError: () => {
      toast.error("Could not update the inventory item.");
    },
  });

  const deleteInvMut = useMutation({
    mutationFn: (invId: number) => deleteInventory(invId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "pharmacy", id] });
      toast.success("Inventory item removed.");
    },
    onError: () => {
      toast.error("Could not remove the inventory item.");
    },
  });

  const openEdit = () => {
    if (!pharmacy.data) return;
    editForm.reset({
      name: pharmacy.data.name,
      address: pharmacy.data.address,
      city: pharmacy.data.city,
      phoneNumber: pharmacy.data.phoneNumber,
      email: pharmacy.data.email,
      openingHours: pharmacy.data.openingHours,
    });
    setEditOpen(true);
  };

  const openInvCreate = () => {
    invForm.reset({ quantity: 0, reorderLevel: 10 });
    setSelectedProduct(null);
    setInvModal({ mode: "create", item: null });
  };

  const openInvEdit = (item: InventoryDTO) => {
    invForm.reset({
      productId: item.productId,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel ?? 0,
    });
    setInvModal({ mode: "edit", item });
  };

  const onInvSubmit = (values: InventoryForm) => {
    if (invModal?.mode === "edit" && invModal.item) {
      updateInvMut.mutate({
        invId: invModal.item.id,
        payload: {
          productId: invModal.item.productId,
          quantity: values.quantity,
          reorderLevel: values.reorderLevel,
          lastRestocked: today(),
          pharmacyId: id,
        },
      });
      return;
    }

    createInvMut.mutate({
      productId: values.productId,
      quantity: values.quantity,
      reorderLevel: values.reorderLevel,
      lastRestocked: today(),
      pharmacyId: id,
    });
  };

  const invSaving = createInvMut.isPending || updateInvMut.isPending;

  const handleRefreshInventory = async () => {
    try {
      await inventory.refetch({ throwOnError: true });
    } catch (error) {
      showApiErrorToast(error, "Could not load pharmacy inventory. Please try again.");
    }
  };

  return (
    <div>
      {pharmacy.isError && <ErrorMessage error={pharmacy.error} />}
      {pharmacy.isLoading && <p className="text-slate-500">Loading pharmacy…</p>}

      {pharmacy.data && (
        <div className="space-y-7 animate-section">
          <PharmacyHero pharmacy={pharmacy.data} inventoryCount={totalInventoryItems} />
          {isStaff && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={openEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit pharmacy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletePharmacyMut.isPending}
                onClick={() => {
                  if (window.confirm(`Delete "${pharmacy.data!.name}"? This cannot be undone.`)) {
                    deletePharmacyMut.mutate();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete pharmacy
              </Button>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.36fr)_minmax(0,0.64fr)]">
            <ContactCard pharmacy={pharmacy.data} />

            <InventoryCard
              inventory={paginatedInventory}
              totalItems={totalInventoryItems}
              currentPage={currentInventoryPage}
              totalPages={totalInventoryPages}
              loading={inventory.isLoading}
              refreshing={inventory.isFetching && !inventory.isLoading}
              error={inventory.error}
              productsById={productsById}
              onRefresh={() => void handleRefreshInventory()}
              onPageChange={(page) => setInventoryPageState({ key: inventoryKey, page })}
              isStaff={isStaff}
              busy={deleteInvMut.isPending}
              onAdd={openInvCreate}
              onEdit={openInvEdit}
              onDelete={(item) => {
                if (window.confirm(`Remove product #${item.productId} from this pharmacy's stock?`)) {
                  deleteInvMut.mutate(item.id);
                }
              }}
            />
          </div>
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit pharmacy">
        <form
          className="space-y-4"
          onSubmit={editForm.handleSubmit((values) => updatePharmacyMut.mutate(values))}
          noValidate
        >
          <PharmacyFormFields form={editForm} />
          <ErrorMessage error={updatePharmacyMut.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePharmacyMut.isPending}>
              {updatePharmacyMut.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!invModal}
        onClose={() => setInvModal(null)}
        title={invModal?.mode === "edit" ? "Edit inventory item" : "Add inventory item"}
      >
        <form className="space-y-4" onSubmit={invForm.handleSubmit(onInvSubmit)} noValidate>
          {invModal?.mode === "edit" ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <span className="text-slate-600">Product</span>{" "}
              <span className="font-medium text-slate-900">
                {invModal.item ? productsById.get(invModal.item.productId)?.name ?? `Product #${invModal.item.productId}` : ""}
              </span>
            </div>
          ) : (
            <ProductSearchSelect
              selectedProduct={selectedProduct}
              onSelect={(product) => {
                setSelectedProduct(product);
                invForm.setValue("productId", product.id, { shouldValidate: true });
              }}
              onClear={() => {
                setSelectedProduct(null);
                invForm.resetField("productId");
              }}
              error={invForm.formState.errors.productId?.message}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-qty">Quantity in stock</Label>
              <Input
                id="inv-qty"
                type="number"
                min={0}
                {...invForm.register("quantity", { valueAsNumber: true })}
              />
              {invForm.formState.errors.quantity && (
                <p className="text-xs text-red-600">{invForm.formState.errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-reorder">Reorder at</Label>
              <Input
                id="inv-reorder"
                type="number"
                min={0}
                {...invForm.register("reorderLevel", { valueAsNumber: true })}
              />
              {invForm.formState.errors.reorderLevel && (
                <p className="text-xs text-red-600">{invForm.formState.errors.reorderLevel.message}</p>
              )}
            </div>
          </div>

          <ErrorMessage error={createInvMut.error || updateInvMut.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setInvModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invSaving}>
              {invSaving ? "Saving..." : invModal?.mode === "edit" ? "Save item" : "Add item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PharmacyHero({
  pharmacy,
  inventoryCount,
}: {
  pharmacy: {
    name: string;
    address?: string;
    city?: string;
    imageUrl?: string;
    openingHours?: string;
  };
  inventoryCount: number;
}) {
  const location = fullAddress(pharmacy.address, pharmacy.city);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-brand-100 bg-white shadow-lg shadow-slate-900/[0.06]">
      <div className="relative aspect-[16/9] overflow-hidden bg-brand-50 sm:aspect-[16/7] lg:aspect-[16/5]">
        <img
          src={getPharmacyImage(pharmacy.imageUrl)}
          alt={pharmacy.name}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
          {inventoryCount > 0 && (
            <Badge variant="success" className="bg-white/95 text-emerald-800 shadow-sm">
              Inventory available
            </Badge>
          )}
          {pharmacy.openingHours && (
            <Badge variant="info" className="bg-white/95 text-brand-800 shadow-sm">
              Hours listed
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 bg-white px-6 py-6 sm:flex-row sm:items-start sm:justify-between lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Partner pharmacy</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-800 lg:text-4xl">
            {pharmacy.name}
          </h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {location}
          </p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm text-slate-700">
          <p className="font-extrabold text-ink-800">{inventoryCount}</p>
          <p>{inventoryCount === 1 ? "inventory item" : "inventory items"} listed</p>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  pharmacy,
}: {
  pharmacy: {
    address?: string;
    city?: string;
    phoneNumber?: string;
    email?: string;
    openingHours?: string;
  };
}) {
  const address = fullAddress(pharmacy.address, pharmacy.city);
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      showSuccessToast("Address copied.");
    } catch (error) {
      showApiErrorToast(error, "Could not copy address. Please try again.");
    }
  };

  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-brand-100 shadow-sm">
      <div className="bg-[linear-gradient(135deg,#ecfdf5_0%,#eff8ff_100%)] px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Pharmacy details</p>
            <CardTitle className="mt-1 text-xl text-ink-800">Contact</CardTitle>
          </div>
        </div>
      </div>
      <CardContent className="space-y-3 p-5">
        <ContactRow
          icon={MapPin}
          label="Address"
          value={address}
          action={
            address !== "Not provided" && "clipboard" in navigator ? (
              <button
                type="button"
                onClick={() => void handleCopyAddress()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            ) : null
          }
        />
        <ContactRow
          icon={Phone}
          label="Phone"
          value={pharmacy.phoneNumber}
          href={pharmacy.phoneNumber ? `tel:${phoneHref(pharmacy.phoneNumber)}` : undefined}
        />
        <ContactRow
          icon={Mail}
          label="Email"
          value={pharmacy.email}
          href={pharmacy.email ? `mailto:${pharmacy.email}` : undefined}
        />
        <ContactRow icon={Clock} label="Hours" value={pharmacy.openingHours} />
      </CardContent>
    </Card>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  href?: string;
  action?: ReactNode;
}) {
  const displayValue = value?.trim() || "Not provided";
  const content = href && displayValue !== "Not provided" ? (
    <a className="font-semibold text-brand-700 hover:text-brand-900 hover:underline" href={href}>
      {displayValue}
    </a>
  ) : (
    <span className={cn("font-semibold", displayValue === "Not provided" ? "text-slate-400" : "text-slate-800")}>
      {displayValue}
    </span>
  );

  return (
    <div className="group flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition-colors hover:border-brand-100 hover:bg-brand-50/30">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          {action}
        </div>
        <p className="mt-1 break-words text-sm leading-6">{content}</p>
      </div>
    </div>
  );
}

function InventoryCard({
  inventory,
  totalItems,
  currentPage,
  totalPages,
  loading,
  refreshing,
  error,
  productsById,
  onRefresh,
  onPageChange,
  isStaff,
  busy,
  onAdd,
  onEdit,
  onDelete,
}: {
  inventory: InventoryDTO[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  loading: boolean;
  refreshing: boolean;
  error: unknown;
  productsById: Map<number, { id: number; name: string; packageSize?: string }>;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  isStaff: boolean;
  busy: boolean;
  onAdd: () => void;
  onEdit: (item: InventoryDTO) => void;
  onDelete: (item: InventoryDTO) => void;
}) {
  return (
    <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-white px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-ink-800">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Package className="h-5 w-5" />
              </span>
              Inventory
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Products currently listed for this pharmacy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{totalItems} items</Badge>
            {isStaff && (
              <Button type="button" size="sm" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading || refreshing}
              aria-label="Refresh pharmacy inventory"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {Boolean(error) && <ErrorMessage error={error} className="mb-4" />}

        {loading && <InventorySkeleton />}

        {!loading && totalItems === 0 && !error && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-4 font-extrabold text-ink-800">No inventory listed</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Product availability for this pharmacy will appear here when inventory data is added.
            </p>
          </div>
        )}

        {!loading && totalItems > 0 && (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Product</th>
                    <th className="px-4 py-3 text-right font-bold">In stock</th>
                    <th className="px-4 py-3 text-right font-bold">Reorder at</th>
                    <th className="px-4 py-3 text-right font-bold">Restocked</th>
                    <th className="px-4 py-3 text-right font-bold">Status</th>
                    {isStaff && <th className="px-4 py-3 text-right font-bold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {inventory.map((inv) => (
                    <InventoryTableRow
                      key={inv.id}
                      item={inv}
                      productsById={productsById}
                      isStaff={isStaff}
                      busy={busy}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {inventory.map((inv) => (
                <InventoryMobileRow
                  key={inv.id}
                  item={inv}
                  productsById={productsById}
                  isStaff={isStaff}
                  busy={busy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {totalItems > INVENTORY_PAGE_SIZE && (
              <InventoryPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InventoryTableRow({
  item,
  productsById,
  isStaff,
  busy,
  onEdit,
  onDelete,
}: {
  item: InventoryDTO;
  productsById: Map<number, { id: number; name: string; packageSize?: string }>;
  isStaff: boolean;
  busy: boolean;
  onEdit: (item: InventoryDTO) => void;
  onDelete: (item: InventoryDTO) => void;
}) {
  const product = productsById.get(item.productId);
  return (
    <tr className="transition-colors hover:bg-brand-50/35">
      <td className="px-4 py-3">
        <Link to={`/products/${item.productId}`} className="font-bold text-brand-700 hover:underline">
          {product?.name ?? `Product #${item.productId}`}
        </Link>
        {product?.packageSize && <p className="mt-1 text-xs text-slate-500">{product.packageSize}</p>}
      </td>
      <td className="px-4 py-3 text-right font-extrabold text-slate-900">{item.quantity}</td>
      <td className="px-4 py-3 text-right text-slate-700">{item.reorderLevel ?? "—"}</td>
      <td className="px-4 py-3 text-right text-xs text-slate-500">
        {formatInstant(item.lastRestocked)}
      </td>
      <td className="px-4 py-3 text-right">
        <InventoryStatusBadge item={item} />
      </td>
      {isStaff && (
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
}

function InventoryMobileRow({
  item,
  productsById,
  isStaff,
  busy,
  onEdit,
  onDelete,
}: {
  item: InventoryDTO;
  productsById: Map<number, { id: number; name: string; packageSize?: string }>;
  isStaff: boolean;
  busy: boolean;
  onEdit: (item: InventoryDTO) => void;
  onDelete: (item: InventoryDTO) => void;
}) {
  const product = productsById.get(item.productId);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/products/${item.productId}`} className="font-bold text-brand-700 hover:underline">
            {product?.name ?? `Product #${item.productId}`}
          </Link>
          {product?.packageSize && <p className="mt-1 text-xs text-slate-500">{product.packageSize}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <InventoryStatusBadge item={item} />
          {isStaff && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <InventoryStat label="In stock" value={String(item.quantity)} />
        <InventoryStat label="Reorder" value={item.reorderLevel?.toString() ?? "—"} />
        <InventoryStat label="Restocked" value={formatInstant(item.lastRestocked)} />
      </div>
    </article>
  );
}

function InventoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate font-extrabold text-ink-800" title={value}>
        {value}
      </p>
    </div>
  );
}

function InventoryStatusBadge({ item }: { item: InventoryDTO }) {
  const lowStock = item.reorderLevel != null && item.quantity > 0 && item.quantity <= item.reorderLevel;
  if (item.quantity <= 0) return <Badge variant="danger">Out of stock</Badge>;
  if (lowStock) return <Badge variant="warning">Low stock</Badge>;
  return (
    <Badge variant="success">
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
      In stock
    </Badge>
  );
}

function InventoryPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = visiblePaginationPages(currentPage, totalPages);
  return (
    <nav
      className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Inventory pagination"
    >
      <p className="text-sm font-medium text-slate-600">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous inventory page"
        >
          Previous
        </Button>
        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-9 items-center px-1 text-sm font-bold text-slate-400"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-label={`Go to inventory page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next inventory page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

function visiblePaginationPages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) pages.add(page);
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  return sortedPages.flatMap((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      return ["ellipsis" as const, page];
    }
    return [page];
  });
}

function InventorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

function fullAddress(address?: string, city?: string) {
  return [address, city].map((part) => part?.trim()).filter(Boolean).join(", ") || "Not provided";
}

function phoneHref(phoneNumber: string) {
  return phoneNumber.replace(/[^\d+]/g, "");
}
