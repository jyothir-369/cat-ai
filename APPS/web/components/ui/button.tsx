"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils"; // Standard helper used for tailwind-merge configuration

// ============================================================================
// ENTERPRISE VARIANT ARCHITECTURE DEFINITION (CVA)
// ============================================================================

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-zinc-100 text-zinc-950 hover:bg-zinc-200 shadow-lg shadow-zinc-950/20 border border-zinc-200/20",
        secondary:
          "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-800/80 shadow-inner",
        outline:
          "bg-transparent text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/50 border border-zinc-800",
        ghost:
          "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40",
        destructive:
          "bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-500/20",
        success:
          "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40 border border-emerald-500/20",
        warning:
          "bg-amber-950/40 text-amber-400 hover:bg-amber-900/40 border border-amber-500/20",
        info:
          "bg-blue-950/40 text-blue-400 hover:bg-blue-900/40 border border-blue-500/20",
        premium:
          "bg-gradient-to-r from-amber-600 to-orange-600 text-zinc-950 hover:opacity-95 shadow-xl shadow-orange-950/20",
        gradient:
          "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-zinc-100 hover:opacity-95 shadow-xl shadow-indigo-950/20",
        enterprise:
          "bg-zinc-950 text-zinc-200 hover:bg-zinc-900 border border-zinc-800 shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:border-zinc-700",
      },
      size: {
        xs: "h-7 px-2.5 text-[10px] rounded-lg tracking-tight",
        sm: "h-9 px-3.5 rounded-lg text-[11px]",
        md: "h-11 px-5 text-xs",
        lg: "h-12 px-7 text-xs sm:px-8",
        xl: "h-14 px-9 text-sm sm:px-10 tracking-widest",
        icon: "h-10 w-10 p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// ============================================================================
// SYSTEM TYPE DEFINITIONS & ANALYTICS CONTRACTS
// ============================================================================

export interface ButtonTelemetryPayload {
  interactionId?: string;
  actionName: string;
  featureFlagKey?: string;
  requiredRole?: string[];
}

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd" | "style">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  telemetry?: ButtonTelemetryPayload;
  hasPermission?: boolean;
}

// Global runtime interaction reporting pipeline
const dispatchButtonTelemetry = (payload: ButtonTelemetryPayload) => {
  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[CAT AI TELEMETRY]: Interaction dispatched -> Action: ${payload.actionName} | Module ID: ${payload.interactionId ?? "GLOBAL"}`
    );
  }
  // Integration endpoints (Datadog, PostHog, or custom metrics router) attach here
};

// ============================================================================
// ENTERPRISE PRODUCTION-READY BUTTON COMPONENT
// ============================================================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      icon,
      iconPosition = "left",
      telemetry,
      hasPermission = true,
      children,
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    // Strategic validation layer enforcement
    const isInteractionLocked = !hasPermission || disabled || loading;

    const handleExecutionIntercept = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isInteractionLocked) {
        e.preventDefault();
        return;
      }

      if (telemetry) {
        dispatchButtonTelemetry(telemetry);
      }

      if (onClick) {
        onClick(e);
      }
    };

    // Render configuration mapping for layout variations
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        disabled={isInteractionLocked}
        onClick={handleExecutionIntercept}
        className={cn(buttonVariants({ variant, size, className }))}
        whileHover={isInteractionLocked ? {} : { y: -1, transition: { duration: 0.1 } }}
        whileTap={isInteractionLocked ? {} : { scale: 0.98 }}
        aria-busy={loading}
        aria-live="polite"
        {...(props as HTMLMotionProps<"button">)}
      >
        <span className="flex items-center justify-center gap-2 pointer-events-none">
          {/* Leading State Management Layout */}
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          ) : (
            icon && iconPosition === "left" && (
              <span className="shrink-0 transition-transform group-hover:translate-x-[-2px]">
                {icon}
              </span>
            )
          )}

          {/* Text Node Matrix Resolution */}
          <span>
            {loading && loadingText ? loadingText : children}
          </span>

          {/* Trailing State Management Layout */}
          {!loading && icon && iconPosition === "right" && (
            <span className="shrink-0 transition-transform group-hover:translate-x-[2px]">
              {icon}
            </span>
          )}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";

// ============================================================================
// ADDITIONAL CONTRACT ARCHITECTURE DIRECTORIES EXPORTS
// ============================================================================

export type ButtonVariants = VariantProps<typeof buttonVariants>;
export type ButtonSizes = NonNullable<ButtonVariants["size"]>;