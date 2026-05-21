// ─────────────────────────────────────────────────────────────────────────────
// PharmaFlow DTOs — kept in sync (by hand) with the Java DTOs in the backend.
// Only the fields the frontend actually reads/writes are typed here; backend
// adds more (timestamps, audit fields, etc.) that we let Axios pass through.
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

// user-health-service
export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  patientProfile?: {
    id: number;
    bloodType?: string;
    height?: number;
    weight?: number;
  };
}

// product-health-service
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

// pharmacy-inventory-service
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
 * Backend Jackson serializes LocalDateTime either as an ISO string OR as a
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
  /** Backend validates these, the SPA fills them in with sensible defaults */
  status: ReservationStatus;
  reservedAt: string;
  expiresAt?: string;
}

// order-prescription-service
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
