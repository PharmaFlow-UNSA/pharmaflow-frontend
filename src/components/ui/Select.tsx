import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const selectVariants = cva(
  "flex h-11 w-full appearance-none rounded-2xl border bg-white px-4 py-2.5 pr-11 text-sm font-semibold ring-offset-white transition-all duration-200 hover:border-brand-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "border-slate-300 text-slate-900 shadow-sm",
        error: "border-red-500 text-slate-900 shadow-sm focus-visible:ring-red-500",
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
    <div className="relative">
      <select
        ref={ref}
        className={cn(selectVariants({ variant }), className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </div>
  )
);
Select.displayName = "Select";
