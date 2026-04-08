import * as React from "react";
import { cn } from "@/lib/utils.js";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-terra-border bg-white/3 px-3 py-1 text-[13px] shadow-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-terra-text placeholder:text-terra-text-muted focus-visible:outline-none focus-visible:border-terra-azure focus-visible:shadow-[0_0_12px_rgba(61,122,184,0.15)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
