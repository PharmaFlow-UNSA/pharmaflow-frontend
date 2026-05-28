// ─────────────────────────────────────────────────────────────────────────────
// PharmaFlow DTOs — kept in sync with the Java DTOs in the backend.
// ─────────────────────────────────────────────────────────────────────────────

export type Role =
  | "ROLE_USER"
  | "ROLE_DOCTOR"
  | "ROLE_PHARMACIST"
  | "ROLE_ADMIN";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  expiresIn: number;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  errors?: Record<string, string>;
}

// ── user-health-service enums ──────────────────────────────────────────────

export type BloodType =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE";

export type Severity =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "SEVERE"
  | "LIFE_THREATENING";

export type Relationship =
  | "SPOUSE"
  | "CHILD"
  | "PARENT"
  | "SIBLING"
  | "GRANDPARENT"
  | "GRANDCHILD"
  | "OTHER";

export const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A−",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B−",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB−",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O−",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  SEVERE: "Severe",
  LIFE_THREATENING: "Life-Threatening",
};

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  SIBLING: "Sibling",
  GRANDPARENT: "Grandparent",
  GRANDCHILD: "Grandchild",
  OTHER: "Other",
};

// ── Health DTOs ────────────────────────────────────────────────────────────

export interface AllergyDTO {
  id?: number;
  allergen: string;
  severity?: Severity;
  activeSubstance?: string;
}

export interface TherapyDTO {
  id?: number;
  medicationName: string;
  dosage?: string;
  frequency?: string;
}

export interface PatientProfileDTO {
  id?: number;
  weight?: number;
  height?: number;
  bloodType?: BloodType;
  allergies: AllergyDTO[];
  therapies: TherapyDTO[];
}

export interface FamilyMemberDTO {
  id: number;
  firstName: string;
  relationship: Relationship;
  patientProfile?: PatientProfileDTO;
  userId: number;
}

export interface FamilyMemberCreatePayload {
  firstName: string;
  relationship: Relationship;
  patientProfile?: Partial<PatientProfileDTO>;
  userId: number;
}

// ── user-health-service ────────────────────────────────────────────────────

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  patientProfile?: PatientProfileDTO;
  familyMemberIds: number[];
}

export interface UpdateUserPayload {
  firstName: string;
  lastName: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ── product-health-service ─────────────────────────────────────────────────

export interface ProductDTO {
  id: number;
  name: string;
  description?: string;
  brandName?: string;
  manufacturer?: string;
  price: number;
  barcode?: string;
  requiresPrescription: boolean;
  productType?: string;
  imageUrl?: string;
  isActive?: boolean;
  packageSize?: string;
  category?: { id: number; name: string };
  substances?: Array<{ id: number; commonName?: string; inn?: string }>;
}

// ── pharmacy-inventory-service ─────────────────────────────────────────────

export interface PharmacyDTO {
  id: number;
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  email: string;
  openingHours: string;
}

export interface InventoryDTO {
  id: number;
  pharmacyId: number;
  productId: number;
  quantity: number;
  reorderLevel?: number;
  lastRestockedAt?: string;
}

export type ReservationStatus =
  | "PENDING"
  | "READY"
  | "CANCELLED"
  | "EXPIRED"
  | "COMPLETED";

/**
 * Backend Jackson serialises LocalDateTime either as an ISO string OR as a
 * [year, month, day, hour, minute, second, nanos] array depending on the
 * service's ObjectMapper config. Type permissively and convert with parseInstant.
 */
export type JavaInstant = string | number[];

export interface ReservationDTO {
  id: number;
  userId: number;
  productId: number;
  pharmacyId: number;
  quantity: number;
  status: ReservationStatus;
  reservedAt: JavaInstant;
  expiresAt?: JavaInstant;
}

export interface ReservationCreatePayload {
  userId: number;
  productId: number;
  pharmacyId: number;
  quantity: number;
  status: ReservationStatus;
  reservedAt: string;
  expiresAt?: string;
}

// ── order-prescription-service ─────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItemDTO {
  id?: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  orderId?: number;
}

export interface PaymentDTO {
  id?: number;
  amount: number;
  method: "CARD" | "CASH" | "TRANSFER";
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  transactionId?: string;
  paidAt?: string;
}

export interface OrderDTO {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string;
  createdAt?: string;
  updatedAt?: string;
  orderItems: OrderItemDTO[];
  payment?: PaymentDTO;
  prescriptionId?: number;
}

// Spring Data Page wrapper — every paginated GET returns this shape.
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// ── product-health-service extended types ─────────────────────────────────

export type ProductType =
  | "MEDICATION"
  | "SUPPLEMENT"
  | "COSMETIC"
  | "MEDICAL_DEVICE";

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
  parentCategoryId?: number;
}

export interface SubstanceDTO {
  id: number;
  inn: string;
  commonName?: string;
  atcCode?: string;
  description?: string;
}

export type SeverityLevel = "MINOR" | "MODERATE" | "MAJOR";

export interface DrugInteractionDTO {
  id: number;
  substanceAId: number;
  substanceBId: number;
  substanceAName?: string;
  substanceBName?: string;
  severity: SeverityLevel;
  description?: string;
  clinicalRecommendation?: string;
}

export type ContraindicationType =
  | "DISEASE"
  | "ALLERGY"
  | "PREGNANCY"
  | "AGE"
  | "OTHER";
export type ContraindicationSeverity = "ABSOLUTE" | "RELATIVE";

export interface ContraindicationDTO {
  id: number;
  substance?: SubstanceDTO;
  type: ContraindicationType;
  conditionName: string;
  description?: string;
  severityType: ContraindicationSeverity;
}

export type SubstituteType = "GENERIC" | "THERAPEUTIC" | "BIOSIMILAR";

export interface ProductSubstituteDTO {
  id: number;
  originalProduct?: ProductDTO;
  substituteProduct?: ProductDTO;
  substituteType: SubstituteType;
  isTherapeuticEquivalent?: boolean;
  note?: string;
}

export interface ProductCreatePayload {
  name: string;
  barcode: string;
  brandName?: string;
  manufacturer: string;
  description?: string;
  price: number;
  packageSize?: string;
  productType: ProductType;
  requiresPrescription: boolean;
  categoryId: number;
  imageUrl?: string;
}

export interface CategoryCreatePayload {
  name: string;
  description?: string;
}
