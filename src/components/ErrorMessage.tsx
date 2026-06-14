import { friendlyErrorMessage } from "@/lib/errors";

interface Props {
  error: unknown;
  className?: string;
}

/** Render an error toast/banner from anything Axios or React Query may throw. */
export function ErrorMessage({ error, className }: Props) {
  if (!error) return null;
  const message = friendlyErrorMessage(error);

  return (
    <div
      role="alert"
      className={"rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 " + (className ?? "")}
    >
      {message}
    </div>
  );
}
