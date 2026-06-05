import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, MapPin, Package, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { getProducts } from "@/api/products";
import { useAuth } from "@/auth/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";
import { PharmacyFormFields } from "@/components/PharmacyFormFields";
import { ProductSearchSelect } from "@/components/ProductSearchSelect";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { pharmacySchema, type PharmacyFormValues } from "@/lib/pharmacySchema";
import { formatDate } from "@/lib/utils";
import type { InventoryDTO, ProductDTO } from "@/types/api";

const inventorySchema = z.object({
  productId: z.number().int().positive("Product ID is required"),
  quantity: z.number().int().min(0, "Quantity must be ≥ 0").max(1_000_000),
  reorderLevel: z.number().int().min(0, "Reorder level must be ≥ 0").max(1_000_000),
});
type InventoryForm = z.infer<typeof inventorySchema>;

const today = () => new Date().toISOString().slice(0, 10);

export function PharmacyDetailPage() {
  const { pharmacyId } = useParams();
  const id = Number(pharmacyId);
  const enabled = Number.isFinite(id) && id > 0;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { hasRole } = useAuth();
  const isStaff = hasRole("ROLE_PHARMACIST", "ROLE_ADMIN");

  const [editOpen, setEditOpen] = useState(false);
  const [invModal, setInvModal] = useState<{ mode: "create" | "edit"; item: InventoryDTO | null } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [confirm, setConfirm] = useState<
    { title: string; body: string; confirmLabel: string; onConfirm: () => void } | null
  >(null);

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

  // Small catalogue lookup so the table can show product names instead of IDs.
  const productsQuery = useQuery({
    queryKey: ["products", "catalog"],
    queryFn: () => getProducts({ size: 200, sort: "name,asc" }),
    staleTime: 5 * 60_000,
  });
  const productName = (productId: number) =>
    productsQuery.data?.content.find((p) => p.id === productId)?.name ?? `Product #${productId}`;

  const editForm = useForm<PharmacyFormValues>({ resolver: zodResolver(pharmacySchema) });
  const invForm = useForm<InventoryForm>({ resolver: zodResolver(inventorySchema) });

  const invalidateInventory = () =>
    queryClient.invalidateQueries({ queryKey: ["inventory", "pharmacy", id] });

  const updatePharmacyMut = useMutation({
    mutationFn: (values: PharmacyFormValues) => updatePharmacy(id, values),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", id] });
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      setEditOpen(false);
      toast.success(`Pharmacy "${p.name}" updated.`);
    },
    onError: (err) => toast.error(err),
  });

  const deletePharmacyMut = useMutation({
    mutationFn: () => deletePharmacy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      setConfirm(null);
      toast.success("Pharmacy deleted.");
      navigate("/pharmacies", { replace: true });
    },
    onError: (err) => toast.error(err),
  });

  const createInvMut = useMutation({
    mutationFn: createInventory,
    onSuccess: () => {
      invalidateInventory();
      setInvModal(null);
      invForm.reset();
      setSelectedProduct(null);
      toast.success("Inventory item added.");
    },
    onError: (err) => toast.error(err),
  });

  const updateInvMut = useMutation({
    mutationFn: ({ invId, payload }: { invId: number; payload: Parameters<typeof updateInventory>[1] }) =>
      updateInventory(invId, payload),
    onSuccess: () => {
      invalidateInventory();
      setInvModal(null);
      invForm.reset();
      toast.success("Inventory item updated.");
    },
    onError: (err) => toast.error(err),
  });

  const deleteInvMut = useMutation({
    mutationFn: (invId: number) => deleteInventory(invId),
    onSuccess: () => {
      invalidateInventory();
      setConfirm(null);
      toast.success("Inventory item removed.");
    },
    onError: (err) => toast.error(err),
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
    } else {
      createInvMut.mutate({
        productId: values.productId,
        quantity: values.quantity,
        reorderLevel: values.reorderLevel,
        lastRestocked: today(),
        pharmacyId: id,
      });
    }
  };

  const invSaving = createInvMut.isPending || updateInvMut.isPending;

  return (
    <div>
      <Link
        to="/pharmacies"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
      >
        ← Back to pharmacies
      </Link>

      {pharmacy.isError && <ErrorMessage error={pharmacy.error} />}
      {pharmacy.isLoading && <p className="text-slate-500">Loading pharmacy…</p>}

      {pharmacy.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle>{pharmacy.data.name}</CardTitle>
                </div>
                {isStaff && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={openEdit}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Delete pharmacy",
                          body: `Delete "${pharmacy.data!.name}"? This removes the pharmacy and cannot be undone.`,
                          confirmLabel: "Delete pharmacy",
                          onConfirm: () => deletePharmacyMut.mutate(),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-slate-700">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {pharmacy.data.address}, {pharmacy.data.city}
                </p>
                <p className="flex items-center gap-2 text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {pharmacy.data.phoneNumber}
                </p>
                <p className="flex items-center gap-2 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {pharmacy.data.email}
                </p>
                <p className="text-xs text-slate-500">Hours: {pharmacy.data.openingHours}</p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Inventory
                </CardTitle>
                {isStaff && (
                  <Button size="sm" onClick={openInvCreate}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add item
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {inventory.isError && <ErrorMessage error={inventory.error} />}
                {inventory.isLoading && <p className="text-sm text-slate-500">Loading inventory…</p>}
                {inventory.data && inventory.data.length === 0 && (
                  <p className="text-sm text-slate-600">
                    No inventory items at this pharmacy.{isStaff ? " Use “Add item” to stock one." : ""}
                  </p>
                )}
                {inventory.data && inventory.data.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 text-right font-medium">In stock</th>
                        <th className="pb-2 text-right font-medium">Reorder at</th>
                        <th className="pb-2 text-right font-medium">Restocked</th>
                        <th className="pb-2 text-right font-medium">Status</th>
                        {isStaff && <th className="pb-2 text-right font-medium">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.data.map((inv) => {
                        const lowStock = inv.reorderLevel != null && inv.quantity <= inv.reorderLevel;
                        return (
                          <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2">
                              <Link
                                to={`/products/${inv.productId}/availability`}
                                className="text-brand-700 hover:underline"
                              >
                                {productName(inv.productId)}
                              </Link>
                            </td>
                            <td className="py-2 text-right font-medium text-slate-900">
                              {inv.quantity}
                            </td>
                            <td className="py-2 text-right text-slate-700">
                              {inv.reorderLevel ?? "—"}
                            </td>
                            <td className="py-2 text-right text-xs text-slate-500">
                              {formatDate(inv.lastRestocked)}
                            </td>
                            <td className="py-2 text-right">
                              {lowStock ? (
                                <Badge variant="warning">Low</Badge>
                              ) : inv.quantity > 0 ? (
                                <Badge variant="success">OK</Badge>
                              ) : (
                                <Badge variant="danger">Out</Badge>
                              )}
                            </td>
                            {isStaff && (
                              <td className="py-2">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Edit item"
                                    onClick={() => openInvEdit(inv)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Delete item"
                                    onClick={() =>
                                      setConfirm({
                                        title: "Remove inventory item",
                                        body: `Remove product #${inv.productId} from this pharmacy's stock?`,
                                        confirmLabel: "Remove item",
                                        onConfirm: () => deleteInvMut.mutate(inv.id),
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit pharmacy modal ─────────────────────────────────────────────── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit pharmacy">
        <form
          className="space-y-4"
          onSubmit={editForm.handleSubmit((v) => updatePharmacyMut.mutate(v))}
          noValidate
        >
          <PharmacyFormFields form={editForm} />
          <ErrorMessage error={updatePharmacyMut.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePharmacyMut.isPending}>
              {updatePharmacyMut.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inventory create/edit modal ─────────────────────────────────────── */}
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
                {invModal.item ? productName(invModal.item.productId) : ""}
              </span>
            </div>
          ) : (
            <ProductSearchSelect
              selectedProduct={selectedProduct}
              onSelect={(p) => {
                setSelectedProduct(p);
                invForm.setValue("productId", p.id, { shouldValidate: true });
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
                <p className="text-xs text-red-600">
                  {invForm.formState.errors.reorderLevel.message}
                </p>
              )}
            </div>
          </div>

          <ErrorMessage error={createInvMut.error || updateInvMut.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setInvModal(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invSaving}>
              {invSaving ? "Saving…" : invModal?.mode === "edit" ? "Save item" : "Add item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm (delete) modal ──────────────────────────────────────────── */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title ?? ""}>
        <p className="text-sm text-slate-600">{confirm?.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deletePharmacyMut.isPending || deleteInvMut.isPending}
            onClick={() => confirm?.onConfirm()}
          >
            {confirm?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
