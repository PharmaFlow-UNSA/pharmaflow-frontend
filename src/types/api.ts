// ─────────────────────────────────────────────────────────────────────────────
// PharmaFlow DTOs — kept in sync with the Java DTOs in the backend.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "ROLE_USER" | "ROLE_DOCTOR" | "ROLE_PHARMACIST" | "ROLE_ADMIN";

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

export type Severity = "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "LIFE_THREATENING";

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
  lastRestocked?: string;
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
  sagaCorrelationId?: string;
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

export interface PharmacyCreatePayload {
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  email: string;
  openingHours: string;
}

export type DeliveryStatus =
  | "PENDING"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED";

export interface DeliveryDTO {
  id: number;
  orderId: number;
  pharmacyId: number;
  deliveryAddress: string;
  status: DeliveryStatus;
  estimatedDelivery?: JavaInstant;
  actualDelivery?: JavaInstant;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

// ── order-prescription-service ─────────────────────────────────────────────

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

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
  createdAt?: JavaInstant;
  updatedAt?: JavaInstant;
  orderItems: OrderItemDTO[];
  payment?: PaymentDTO;
  prescriptionId?: number;
}

export interface OrderCreatePayload {
  userId: number;
  shippingAddress: string;
  prescriptionId?: number;
  orderItems: OrderItemDTO[];
  payment?: PaymentDTO;
}

// ── Prescriptions ──────────────────────────────────────────────────────────

export type PrescriptionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PrescriptionDTO {
  id: number;
  userId: number;
  imageUrl: string;
  status: PrescriptionStatus;
  uploadedAt?: JavaInstant;
  reviewedAt?: JavaInstant;
  reviewerNotes?: string;
  orderIds?: number[];
  autoRefillSubscriptionIds?: number[];
}

export interface PrescriptionCreatePayload {
  userId: number;
  imageUrl: string;
}

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

// ── Auto-Refill Subscriptions ──────────────────────────────────────────────

export type AutoRefillStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "COMPLETED";

export interface AutoRefillSubscriptionDTO {
  id: number;
  userId: number;
  productId: number;
  dosagePerDay: number;
  tabletsPerPackage: number;
  intervalDays?: number;
  nextOrderDate?: string;
  status: AutoRefillStatus;
  shippingAddress: string;
  prescriptionId?: number;
}

export type AutoRefillCreatePayload = Omit<AutoRefillSubscriptionDTO, "id" | "intervalDays" | "nextOrderDate">;

export const AUTO_REFILL_STATUS_LABELS: Record<AutoRefillStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

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
