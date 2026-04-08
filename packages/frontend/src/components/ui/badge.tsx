import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-terra-azure bg-terra-azure/12 text-terra-azure",
        secondary:
          "border-terra-border bg-white/6 text-terra-text-secondary",
        destructive:
          "border-terra-magma bg-terra-magma/12 text-terra-magma",
        outline: "border-terra-border text-terra-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps): React.ReactElement {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
export type { BadgeProps };
