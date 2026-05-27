import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  "flex w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-300 text-slate-900",
        error: "border-red-500 text-slate-900 focus-visible:ring-red-500",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(selectVariants({ variant }), className)}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
