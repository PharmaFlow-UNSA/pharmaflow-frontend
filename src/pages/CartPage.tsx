import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ShoppingCart, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { createOrder } from "@/api/orders";
import { getPrescriptions } from "@/api/prescriptions";
import { getProductById } from "@/api/products";
import { getCurrentUser } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import { useCart } from "@/cart/useCart";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { formatPrice, getProductImage } from "@/lib/catalog";
import { useToast } from "@/toast/useToast";

const checkoutSchema = z.object({
  shippingAddress: z.string().min(5, "Enter a delivery address").max(255),
  prescriptionId: z.number().int().positive().optional(),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const userQuery = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
    enabled: Boolean(user),
  });

  const productQueries = useQueries({
    queries: cart.items.map((item) => ({
      queryKey: ["product", item.productId],
      queryFn: () => getProductById(item.productId),
      enabled: cart.items.length > 0,
      staleTime: 30_000,
    })),
  });

  const refreshedProducts = productQueries
    .map((query) => query.data)
    .filter((product) => Boolean(product));
  const hasRxItem = cart.items.some((item) => item.requiresPrescription);

  const rxQuery = useQuery({
    queryKey: ["prescriptions", "approved", userQuery.data?.id],
    queryFn: () =>
      getPrescriptions({
        userId: userQuery.data?.id,
        status: "APPROVED",
        size: 20,
        sort: "uploadedAt,desc",
      }),
    enabled: Boolean(userQuery.data?.id) && hasRxItem,
  });

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { shippingAddress: "" },
  });

  const checkout = useMutation({
    mutationFn: async (values: CheckoutForm) => {
      if (!userQuery.data?.id) throw new Error("Sign in before checkout.");
      const latestProducts = await Promise.all(
        cart.items.map((item) => getProductById(item.productId))
      );
      const orderItems = latestProducts.map((product) => {
        const cartItem = cart.items.find((item) => item.productId === product.id);
        if (!cartItem) throw new Error("Cart item changed during checkout.");
        return {
          productId: product.id,
          productName: product.name,
          quantity: cartItem.quantity,
          unitPrice: product.price,
        };
      });
      const amount = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      return createOrder({
        userId: userQuery.data.id,
        shippingAddress: values.shippingAddress,
        prescriptionId: values.prescriptionId,
        orderItems,
        payment: {
          amount,
          method: "CASH",
          status: "PENDING",
        },
      });
    },
    onSuccess: (order) => {
      cart.clearCart();
      toast.success(`Order #${order.id} was placed.`);
      navigate(`/orders/${order.id}`, { replace: true });
    },
  });

  const currentSubtotal = cart.items.reduce((sum, item) => {
    const latest = refreshedProducts.find((product) => product?.id === item.productId);
    return sum + item.quantity * (latest?.price ?? item.price);
  }, 0);
  const approvedRxList = rxQuery.data?.content ?? [];
  const noApprovedRx = Boolean(user) && hasRxItem && approvedRxList.length === 0;

  return (
    <div className="space-y-8 animate-section">
      <section className="rounded-[2rem] border border-brand-100 bg-[radial-gradient(circle_at_85%_18%,rgba(14,165,233,0.16),transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_58%,#eff8ff_100%)] p-7 shadow-sm lg:p-8">
        <h1 className="flex items-center gap-3 text-4xl font-extrabold tracking-tight text-ink-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-100">
            <ShoppingCart className="h-6 w-6" />
          </span>
          Cart
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">Review products, quantities, and prescription requirements before checkout.</p>
      </section>

      {cart.items.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <ShoppingCart className="h-7 w-7" />
          </span>
          <p className="mt-5 text-lg font-extrabold text-ink-800">Your cart is empty</p>
          <p className="mt-2 text-sm text-slate-500">Add products from the catalog to start an order.</p>
          <Link to="/products" className="mt-5 inline-flex">
            <Button className="rounded-xl">Browse products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <section className="space-y-3">
            {cart.items.map((item) => {
              const latest = refreshedProducts.find((product) => product?.id === item.productId);
              const priceChanged = latest && latest.price !== item.price;
              return (
                <article key={item.productId} className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
                  <img
                    src={getProductImage({ imageUrl: latest?.imageUrl ?? item.imageUrl })}
                    alt={item.name}
                    className="h-28 w-28 rounded-2xl bg-slate-50 object-contain p-2"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link to={`/products/${item.productId}`} className="font-semibold text-slate-900 hover:text-brand-700">
                          {latest?.name ?? item.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {(latest?.requiresPrescription ?? item.requiresPrescription) ? (
                            <Badge variant="warning">Prescription required</Badge>
                          ) : (
                            <Badge variant="success">OTC</Badge>
                          )}
                          {priceChanged && <Badge variant="info">Price refreshed</Badge>}
                        </div>
                      </div>
                      <p className="text-lg font-extrabold text-ink-800">{formatPrice(latest?.price ?? item.price)}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Label htmlFor={`quantity-${item.productId}`} className="sr-only">Quantity</Label>
                      <Input
                        id={`quantity-${item.productId}`}
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity}
                        onChange={(event) => cart.updateQuantity(item.productId, Number(event.target.value))}
                        className="w-24 rounded-xl shadow-sm"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => cart.removeItem(item.productId)}>
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="h-fit rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <span className="font-medium text-slate-700">Subtotal</span>
              <span className="text-3xl font-extrabold text-ink-800">{formatPrice(currentSubtotal)}</span>
            </div>

            {hasRxItem && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>One or more products require an approved prescription before checkout.</p>
              </div>
            )}

            {!user ? (
              <Button
                className="mt-5 w-full rounded-xl"
                onClick={() => navigate("/login", { state: { from: location.pathname } })}
              >
                Sign in to checkout
              </Button>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => checkout.mutate(values))}>
                <div className="space-y-1.5">
                  <Label htmlFor="shippingAddress">Shipping address</Label>
                  <Input id="shippingAddress" className="rounded-xl shadow-sm" placeholder="Maršala Tita 25, Sarajevo" {...form.register("shippingAddress")} />
                  {form.formState.errors.shippingAddress && (
                    <p className="text-xs text-red-600">{form.formState.errors.shippingAddress.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment method</Label>
                  <div
                    id="paymentMethod"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    Payment on pickup
                  </div>
                </div>
                {hasRxItem && approvedRxList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="prescriptionId">Approved prescription</Label>
                    <Select id="prescriptionId" {...form.register("prescriptionId", { valueAsNumber: true })} defaultValue="">
                      <option value="">Select a prescription...</option>
                      {approvedRxList.map((rx) => (
                        <option key={rx.id} value={rx.id}>#{rx.id} uploaded {rx.uploadedAt ? String(rx.uploadedAt).slice(0, 10) : "?"}</option>
                      ))}
                    </Select>
                  </div>
                )}
                {noApprovedRx && (
                  <p className="text-sm text-amber-700">
                    No approved prescription found. Upload one from Prescriptions before placing this order.
                  </p>
                )}
                <ErrorMessage error={checkout.error} />
                <Button className="w-full rounded-xl" type="submit" disabled={checkout.isPending || noApprovedRx}>
                  {checkout.isPending ? "Placing order..." : "Place order"}
                </Button>
              </form>
            )}

            <Button type="button" variant="outline" className="mt-3 w-full rounded-xl" onClick={cart.clearCart}>
              Clear cart
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
