import { Info, MessageCircle, PackageCheck, Pill, RefreshCw, TriangleAlert } from "lucide-react";
import type { NotificationType } from "@/types/api";

export function NotificationTypeIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  switch (type) {
    case "THERAPY_REMINDER":
      return <Pill className={className} />;
    case "REFILL_ALERT":
      return <RefreshCw className={className} />;
    case "RECALL_ALERT":
      return <TriangleAlert className={className} />;
    case "CHAT":
      return <MessageCircle className={className} />;
    case "SYSTEM":
      return <Info className={className} />;
    default:
      return <PackageCheck className={className} />;
  }
}
