// ─────────────────────────────────────────────────────────────────────────────
// PharmaFlow DTOs — kept in sync with the Java DTOs in the backend.
// ─────────────────────────────────────────────────────────────────────────────

export type Role =
  | "ROLE_USER"
  | "ROLE_DOCTOR"
  | "ROLE_PHARMACIST"
  | "ROLE_ADMIN";

export interface AuthResponse {
  userId: number;
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

// smart-features-service symptoms
export type SymptomSeverityLevel = "LOW" | "MEDIUM" | "HIGH";

export interface SymptomDTO {
  id: number;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  severityLevel?: SymptomSeverityLevel | null;
  isActive: boolean;
}

export interface SymptomPayload {
  name: string;
  description?: string | null;
  tags?: string[] | null;
  severityLevel?: SymptomSeverityLevel | null;
  isActive: boolean;
}

export interface SymptomSearchDTO {
  id: number;
  userId: number;
  patientProfileId?: number | null;
  searchQuery: string;
  searchedAt: JavaInstant;
}

export interface SymptomSearchPayload {
  userId: number;
  patientProfileId?: number | null;
  searchQuery: string;
}

export interface SymptomSearchItemDTO {
  id: number;
  searchId: number;
  symptomId: number;
  symptomName: string;
}

export interface SymptomSearchItemPayload {
  symptomId: number;
}

export interface SymptomProductMatchDTO {
  id?: number | null;
  symptomId?: number | null;
  productId: number;
  relevanceScore?: number | null;
  matchReason?: string | null;
  matchedSymptomIds?: number[] | null;
}

export interface SymptomProductMatchPayload {
  productId: number;
  relevanceScore?: number | null;
  matchReason?: string | null;
}

// smart-features-service recommendations
export type RecommendationType =
  | "FREQUENTLY_BOUGHT_TOGETHER"
  | "FOR_YOU"
  | "SEASONAL"
  | "SIMILAR_PRODUCT"
  | "ALTERNATIVE";

export type RecommendationStatus = "ACTIVE" | "EXPIRED" | "DISMISSED";

export type RecommendationEventType =
  | "VIEWED"
  | "CLICKED"
  | "ADDED_TO_CART"
  | "PURCHASED"
  | "DISMISSED"
  | "RESERVATION_REQUESTED"
  | "RESERVATION_CONFIRMED"
  | "RESERVATION_FAILED"
  | "RESERVATION_COMPENSATED";

export type RecommendationReservationSagaStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "COMPENSATION_REQUESTED"
  | "COMPENSATED";

export interface RecommendationDTO {
  id: number;
  userId: number;
  patientProfileId?: number | null;
  productId: number;
  recommendationType: RecommendationType;
  score?: number | null;
  reasonText?: string | null;
  generatedAt?: JavaInstant | null;
  expiresAt?: JavaInstant | null;
  status: RecommendationStatus;
}

export interface RecommendationPayload {
  userId: number;
  patientProfileId?: number | null;
  productId: number;
  recommendationType: RecommendationType;
  score?: number | null;
  reasonText?: string | null;
  expiresAt?: string | null;
}

export interface RecommendationGeneratePayload {
  userId: number;
  patientProfileId?: number | null;
  recommendationType: RecommendationType;
  seedProductId?: number | null;
  symptomIds?: number[] | null;
  limit?: number | null;
  expiresAt?: string | null;
}

export interface RecommendationInteractionPayload {
  interactionType: RecommendationEventType;
}

export interface RecommendationReservationPayload {
  pharmacyId: number;
  quantity: number;
  expiresAt?: string | null;
}

export interface RecommendationEventDTO {
  id: number;
  recommendationId: number;
  eventType: RecommendationEventType;
  eventTime?: JavaInstant | null;
}

export interface RecommendationReservationSagaDTO {
  id: number;
  correlationId: string;
  recommendationId: number;
  userId: number;
  patientProfileId?: number | null;
  productId: number;
  pharmacyId: number;
  quantity: number;
  reservationId?: number | null;
  status: RecommendationReservationSagaStatus;
  failureReason?: string | null;
  createdAt?: JavaInstant | null;
  updatedAt?: JavaInstant | null;
}

// smart-features-service fraud detection
export type FraudDecision = "APPROVED" | "REVIEW" | "BLOCKED";

export type FraudEventType = "TRIGGERED" | "REVIEWED" | "BLOCKED" | "CLEARED" | "SKIPPED";

export type FraudRuleCode =
  | "ORDER_HIGH_QUANTITY"
  | "ORDER_VELOCITY"
  | "PAYMENT_REPEATED_FAILURES"
  | "USER_RESTRICTED_PRODUCT_FREQUENCY"
  | "ACCOUNT_SHARED_CONTACT"
  | "ACCOUNT_NEW_LARGE_ORDER"
  | "ACCOUNT_SUSPICIOUS_ACCESS"
  | "PRESCRIPTION_REJECTED_REPEAT"
  | "PRESCRIPTION_REUSED"
  | "PRESCRIPTION_MANY_USERS"
  | "PRODUCT_CONTROLLED_QUANTITY"
  | "PRODUCT_UNUSUAL_COMBINATION";

export type FraudRuleCategory = "ORDER" | "ACCOUNT" | "PRESCRIPTION" | "PRODUCT";

export interface FraudRuleDTO {
  id: number;
  ruleName: string;
  ruleCode: FraudRuleCode;
  category: FraudRuleCategory;
  description?: string;
  weight: number;
  isActive: boolean;
}

export interface FraudRulePayload {
  ruleName: string;
  ruleCode: FraudRuleCode;
  category: FraudRuleCategory;
  description?: string;
  weight: number;
  isActive: boolean;
}

export interface FraudCheckDTO {
  id: number;
  userId: number;
  orderId: number;
  riskScore: number;
  decision: FraudDecision;
  checkedAt: string;
}

export interface FraudCheckPayload {
  orderId: number;
}

export interface FraudLogDTO {
  id: number;
  fraudCheckId: number;
  fraudRuleId: number;
  eventType: FraudEventType;
  details: string;
  scoreContribution: number;
  createdAt: string;
}

// smart-features-service notifications
export type NotificationType =
  | "THERAPY_REMINDER"
  | "REFILL_ALERT"
  | "RECALL_ALERT"
  | "CHAT"
  | "SYSTEM";

export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH" | "SMS";

export type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export type NotificationTriggerSource =
  | "THERAPY"
  | "RECALL"
  | "AUTO_REFILL"
  | "CHATBOT"
  | "FRAUD"
  | "SYSTEM";

export type TherapyReminderStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELED";

export interface NotificationDTO {
  id: number;
  therapyReminderId?: number | null;
  userId: number;
  patientProfileId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  createdAt?: JavaInstant | null;
  sentAt?: JavaInstant | null;
  readAt?: JavaInstant | null;
}

export interface NotificationTriggerDTO {
  id: number;
  notificationId: number;
  triggerSource: NotificationTriggerSource;
  sourceEntityId?: number | null;
  triggeredAt?: JavaInstant | null;
}

export interface TherapyReminderDTO {
  id: number;
  patientProfileId: number;
  productId: number;
  dosageInstruction?: string | null;
  frequencyPerDay: number;
  startDate: string;
  endDate?: string | null;
  nextReminderAt?: JavaInstant | null;
  status: TherapyReminderStatus;
}

// smart-features-service chatbot
export type FaqCategory =
  | "ACCOUNT"
  | "ORDERS"
  | "PRESCRIPTIONS"
  | "PAYMENTS"
  | "DELIVERY";

export interface ChatbotAskPayload {
  message: string;
}

export interface ChatbotAskResponse {
  answer: string;
  matchedQuestion?: string | null;
  confidence?: number | null;
  category?: FaqCategory | null;
  fallback: boolean;
}

export interface FaqEntryDTO {
  id: number;
  question: string;
  answer: string;
  category: FaqCategory;
  keywords?: string | null;
  isActive: boolean;
  updatedAt?: string;
}

export interface FaqEntryPayload {
  question: string;
  answer: string;
  category: FaqCategory;
  keywords?: string | null;
  isActive: boolean;
}

export type ChatSessionType = "FAQ_BOT" | "PHARMACIST_CHAT";
export type ChatSessionStatus = "OPEN" | "CLOSED" | "ESCALATED";
export type ChatSenderType = "USER" | "BOT" | "PHARMACIST" | "SYSTEM";

export interface ChatSessionDTO {
  id: number;
  userId: number;
  patientProfileId?: number | null;
  sessionType: ChatSessionType;
  status: ChatSessionStatus;
  startedAt: string;
  endedAt?: string | null;
}

export interface ChatSessionPayload {
  userId: number;
  patientProfileId?: number | null;
  sessionType: ChatSessionType;
}

export interface ChatMessageDTO {
  id: number;
  sessionId: number;
  senderType: ChatSenderType;
  senderId?: number | null;
  messageText?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
}

export interface ChatMessagePayload {
  senderType: ChatSenderType;
  senderId?: number | null;
  messageText?: string | null;
  attachmentUrl?: string | null;
}

export interface ChatIntentMatchDTO {
  id: number;
  messageId: number;
  faqId: number;
  detectedIntent: string;
  confidenceScore: number;
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
