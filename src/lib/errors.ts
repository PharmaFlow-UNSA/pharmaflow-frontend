import axios from "axios";
import { notify } from "@/toast/toastBus";
import type { ApiError } from "@/types/api";

const TECHNICAL_PATTERNS = [
  /exception/i,
  /stack trace/i,
  /java\./i,
  /org\.springframework/i,
  /hibernate/i,
  /sql/i,
];

export function friendlyErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError<ApiError>(error)) {
    if (!error.response) return "Network error. Check your connection and try again.";

    const status = error.response.status;
    const data = error.response.data;
    const backendMessage = cleanMessage(data?.message);
    const validation = fieldErrorSummary(data?.errors);

    if (status === 400) return validation ?? backendMessage ?? "Check the form and try again.";
    if (status === 401) return "Your session expired. Please sign in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return backendMessage ?? "We could not find that item.";
    if (status === 409) return backendMessage ?? "This item was changed or already exists.";
    if (status === 422) return validation ?? backendMessage ?? "Some information needs attention.";
    if (status >= 500) return "Server error. Please try again in a moment.";

    return validation ?? backendMessage ?? fallback;
  }

  if (error instanceof Error) return cleanMessage(error.message) ?? fallback;
  if (typeof error === "string") return cleanMessage(error) ?? fallback;
  return fallback;
}

export function getApiErrorMessage(error: unknown, fallbackMessage = "Something went wrong. Please try again."): string {
  return friendlyErrorMessage(error, fallbackMessage);
}

export function showApiErrorToast(error: unknown, fallbackMessage = "Something went wrong. Please try again."): void {
  notify({
    variant: "error",
    description: getApiErrorMessage(error, fallbackMessage),
  });
}

export function showSuccessToast(message: string): void {
  notify({
    variant: "success",
    description: message,
  });
}

function cleanMessage(message?: string | null): string | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) return null;
  if (trimmed.length > 180) return `${trimmed.slice(0, 177)}...`;
  return trimmed;
}

function fieldErrorSummary(errors?: Record<string, string>): string | null {
  if (!errors || Object.keys(errors).length === 0) return null;
  const values = Object.entries(errors)
    .slice(0, 3)
    .map(([field, message]) => `${humanizeField(field)}: ${message}`);
  return values.join("; ");
}

function humanizeField(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}
