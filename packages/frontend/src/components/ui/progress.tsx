import * as React from "react";
import { cn } from "@/lib/utils.js";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          "relative h-0.5 w-full overflow-hidden rounded-full bg-terra-azure/15",
          className,
        )}
        {...props}
      >
        <div
          className="h-full w-full flex-1 bg-terra-azure/60 transition-all"
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
export type { ProgressProps };
