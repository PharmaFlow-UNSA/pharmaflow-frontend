import { CalendarClock, Pill, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatInstant } from "@/lib/utils";
import type { ProductDTO, RecommendationDTO } from "@/types/api";
import {
  formatRecommendationScore,
  RECOMMENDATION_STATUS_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  recommendationStatusVariant,
} from "./recommendationMeta";

interface Props {
  recommendation: RecommendationDTO;
  product?: ProductDTO;
  compact?: boolean;
  dismissing?: boolean;
  onCheckAvailability?: (recommendation: RecommendationDTO) => void;
  onReserve?: (recommendation: RecommendationDTO) => void;
  onDismiss?: (recommendation: RecommendationDTO) => void;
}

export function RecommendationCard({
  recommendation,
  product,
  compact = false,
  dismissing = false,
  onCheckAvailability,
  onReserve,
  onDismiss,
}: Props) {
  const isActive = recommendation.status === "ACTIVE";
  const availabilityHref = `/products/${recommendation.productId}/availability`;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 text-brand-600" />
              {product?.name ?? `Product #${recommendation.productId}`}
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {product?.brandName ?? product?.manufacturer ?? "Product details unavailable"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="info">{RECOMMENDATION_TYPE_LABELS[recommendation.recommendationType]}</Badge>
            <Badge variant={recommendationStatusVariant(recommendation.status)}>
              {RECOMMENDATION_STATUS_LABELS[recommendation.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-slate-900">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {formatRecommendationScore(recommendation.score)}
          </span>
          {recommendation.expiresAt && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <CalendarClock className="h-4 w-4" />
              Expires {formatInstant(recommendation.expiresAt)}
            </span>
          )}
        </div>

        {recommendation.reasonText && !compact && (
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{recommendation.reasonText}</p>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Product suggestions are informational and do not replace medical advice.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to={availabilityHref}
            onClick={() => onCheckAvailability?.(recommendation)}
            className="inline-flex h-9 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Check availability
          </Link>
          {isActive && onReserve && (
            <Button type="button" variant="outline" size="sm" onClick={() => onReserve(recommendation)}>
              Reserve
            </Button>
          )}
          {isActive && onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={dismissing}
              onClick={() => onDismiss(recommendation)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {dismissing ? "Dismissing..." : "Dismiss"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
