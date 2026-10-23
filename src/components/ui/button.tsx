import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold cursor-pointer select-none",
    "transition-[background-color,color,box-shadow,scale] duration-150 ease-[var(--ease-out-quart)]",
    "active:not-disabled:scale-[0.96] data-[static=true]:active:scale-100",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground shadow-[var(--shadow-sm)] hover:bg-brand/90",
        highlight: "bg-highlight text-ink shadow-[var(--shadow-sm)] hover:bg-highlight/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-sm)] hover:bg-destructive/90",
        outline:
          "bg-card text-foreground shadow-[var(--shadow-ring),var(--shadow-xs)] hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-link underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[0.8125rem]",
        lg: "h-11 px-6 text-[0.9375rem]",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Turn off the press-scale feedback (e.g. inside dense toolbars). */
  static?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, static: isStatic, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        data-static={isStatic ? "true" : undefined}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
