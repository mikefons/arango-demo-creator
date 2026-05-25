import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arango-400 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-arango-400 text-background hover:bg-arango-300 shadow-lg shadow-arango-900/40 active:scale-[0.98]",
        secondary:
          "bg-background-tertiary text-slate-200 border border-border hover:border-arango-400/40 hover:bg-background-tertiary/80",
        ghost:
          "text-muted hover:text-slate-200 hover:bg-background-tertiary",
        destructive:
          "bg-red-900/40 text-red-400 border border-red-800/50 hover:bg-red-900/60",
        outline:
          "border border-border bg-transparent text-slate-200 hover:border-arango-400/50 hover:bg-background-tertiary",
        emerald:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20",
        "outline-arango":
          "border border-arango-400/50 text-arango-400 bg-transparent hover:bg-arango-400/10",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
