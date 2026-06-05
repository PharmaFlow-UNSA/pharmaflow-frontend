import { getApiErrorMessage } from "@/lib/apiError";

interface Props {
  error: unknown;
  className?: string;
}

/** Render an error banner from anything Axios or React Query may throw. */
export function ErrorMessage({ error, className }: Props) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={"rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 " + (className ?? "")}
    >
      {getApiErrorMessage(error)}
    </div>
  );
}
