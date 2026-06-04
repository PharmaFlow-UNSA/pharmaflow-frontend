import type {
  RecommendationReservationSagaStatus,
  RecommendationStatus,
  RecommendationType,
} from "@/types/api";

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  FREQUENTLY_BOUGHT_TOGETHER: "Frequently bought together",
  FOR_YOU: "For you",
  SEASONAL: "Seasonal",
  SIMILAR_PRODUCT: "Similar product",
  ALTERNATIVE: "Alternative",
};

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  DISMISSED: "Dismissed",
};

export const SAGA_STATUS_LABELS: Record<RecommendationReservationSagaStatus, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  COMPENSATION_REQUESTED: "Compensation requested",
  COMPENSATED: "Compensated",
};

export function formatRecommendationScore(score?: number | null): string {
  return score == null ? "Score unavailable" : `${Math.round(score * 100)}% match`;
}

export function recommendationStatusVariant(
  status: RecommendationStatus
): "success" | "warning" | "danger" {
  if (status === "ACTIVE") return "success";
  if (status === "EXPIRED") return "warning";
  return "danger";
}
