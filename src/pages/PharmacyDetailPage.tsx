import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, MapPin, Package, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getInventoryForPharmacy, getPharmacyById } from "@/api/pharmacies";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function PharmacyDetailPage() {
  const { pharmacyId } = useParams();
  const id = Number(pharmacyId);
  const enabled = Number.isFinite(id) && id > 0;

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

  return (
    <div>
      <Link
        to="/pharmacies"
        className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to pharmacies
      </Link>

      {pharmacy.isError && <ErrorMessage error={pharmacy.error} />}
      {pharmacy.isLoading && <p className="text-slate-500">Loading pharmacy…</p>}

      {pharmacy.data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <CardTitle>{pharmacy.data.name}</CardTitle>
                </div>
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.isError && <ErrorMessage error={inventory.error} />}
                {inventory.isLoading && <p className="text-sm text-slate-500">Loading inventory…</p>}
                {inventory.data && inventory.data.length === 0 && (
                  <p className="text-sm text-slate-600">No inventory items at this pharmacy.</p>
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
                                Product #{inv.productId}
                              </Link>
                            </td>
                            <td className="py-2 text-right font-medium text-slate-900">
                              {inv.quantity}
                            </td>
                            <td className="py-2 text-right text-slate-700">
                              {inv.reorderLevel ?? "—"}
                            </td>
                            <td className="py-2 text-right text-xs text-slate-500">
                              {inv.lastRestocked ?? "—"}
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
    </div>
  );
}
