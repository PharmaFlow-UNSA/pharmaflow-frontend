import { z } from "zod";

/**
 * Mirrors the backend PharmacyCreateDTO validation (Jakarta annotations) so the
 * client rejects the same input the server would. Used by both the create form
 * (PharmaciesPage) and the edit form (PharmacyDetailPage).
 */
export const pharmacySchema = z.object({
  name: z.string().min(2, "Must be 2–100 characters").max(100, "Must be 2–100 characters"),
  address: z.string().min(5, "Must be 5–200 characters").max(200, "Must be 5–200 characters"),
  city: z
    .string()
    .min(2, "Must be 2–100 characters")
    .max(100, "Must be 2–100 characters")
    .regex(/^[A-Za-zÀ-ÿ\s'-]+$/, "Letters, spaces, hyphens and apostrophes only"),
  phoneNumber: z
    .string()
    .regex(/^[+]?[0-9\s-]{7,20}$/, "7–20 digits; +, spaces and hyphens allowed"),
  email: z.string().email("Enter a valid email").max(100, "Max 100 characters"),
  openingHours: z.string().min(1, "Required").max(50, "Max 50 characters"),
});

export type PharmacyFormValues = z.infer<typeof pharmacySchema>;
