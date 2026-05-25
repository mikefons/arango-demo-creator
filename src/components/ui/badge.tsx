import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-arango-400/15 text-arango-400 border border-arango-400/25",
        emerald:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
        muted:
          "bg-background-tertiary text-muted border border-border",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20",
        amber:
          "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
