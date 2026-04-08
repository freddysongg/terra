import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-medium transition-all duration-350 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-terra-azure bg-terra-azure/15 text-terra-azure shadow-[0_0_12px_rgba(61,122,184,0.15)] hover:bg-terra-azure/25 hover:shadow-[0_0_24px_rgba(61,122,184,0.3)]",
        destructive:
          "border border-terra-magma bg-terra-magma/10 text-terra-magma shadow-[0_0_12px_rgba(196,75,47,0.1)] hover:bg-terra-magma/20 hover:shadow-[0_0_24px_rgba(196,75,47,0.2)]",
        outline:
          "border border-terra-border bg-transparent text-terra-text-secondary hover:border-terra-azure/50 hover:text-terra-text",
        secondary:
          "border border-terra-border bg-transparent text-terra-text-secondary hover:bg-white/6 hover:text-terra-text",
        ghost:
          "text-terra-text-secondary hover:bg-white/6 hover:text-terra-text",
        link: "text-terra-azure underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 px-3.5 text-[11px]",
        lg: "h-10 px-8",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
