import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { PharmacyFormValues } from "@/lib/pharmacySchema";

/** Shared input set for the pharmacy create + edit forms. */
export function PharmacyFormFields({ form }: { form: UseFormReturn<PharmacyFormValues> }) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="ph-name">Name</Label>
        <Input id="ph-name" placeholder="Apoteka Centar" {...register("name")} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ph-address">Address</Label>
        <Input id="ph-address" placeholder="Maršala Tita 25" {...register("address")} />
        {errors.address && <p className="text-xs text-red-600">{errors.address.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ph-city">City</Label>
          <Input id="ph-city" placeholder="Sarajevo" {...register("city")} />
          {errors.city && <p className="text-xs text-red-600">{errors.city.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ph-phone">Phone</Label>
          <Input id="ph-phone" placeholder="+387 33 100200" {...register("phoneNumber")} />
          {errors.phoneNumber && (
            <p className="text-xs text-red-600">{errors.phoneNumber.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ph-email">Email</Label>
        <Input id="ph-email" type="email" placeholder="apoteka@pharmaflow.ba" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ph-hours">Opening hours</Label>
        <Input id="ph-hours" placeholder="08:00-20:00" {...register("openingHours")} />
        {errors.openingHours && (
          <p className="text-xs text-red-600">{errors.openingHours.message}</p>
        )}
      </div>
    </>
  );
}
