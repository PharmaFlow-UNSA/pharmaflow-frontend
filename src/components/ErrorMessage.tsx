import axios from "axios";
import type { ApiError } from "@/types/api";

interface Props {
  error: unknown;
  className?: string;
}

/** Render an error toast/banner from anything Axios or React Query may throw. */
export function ErrorMessage({ error, className }: Props) {
  if (!error) return null;
  let message = "Something went wrong.";

  if (axios.isAxiosError<ApiError>(error)) {
    const data = error.response?.data;
    if (data?.message) message = data.message;
    else if (typeof error.message === "string") message = error.message;

    if (data?.errors) {
      // Field-level validation errors → join into a readable line.
      const fieldErrors = Object.entries(data.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join("; ");
      message = `${message} (${fieldErrors})`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div
      role="alert"
      className={"rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 " + (className ?? "")}
    >
      {message}
    </div>
  );
}
