import axios from "axios";
import type { ApiError } from "@/types/api";

/**
 * Turn anything Axios or React Query may throw into a human-readable line.
 * Prefers the backend's GlobalExceptionHandler `message`, and appends the
 * field-level `errors` map (Jakarta validation) when present.
 */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  let message = fallback;

  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    if (data?.message) message = data.message;
    else if (typeof error.message === "string") message = error.message;

    if (data?.errors) {
      const fieldErrors = Object.entries(data.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join("; ");
      message = `${message} (${fieldErrors})`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return message;
}
