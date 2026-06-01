"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowUpRight, ShieldCheck, Loader2 } from "lucide-react";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & ENTERPRISE DESIGN CONTRACTS
// ============================================================================

const cardVariants = cva(
  "relative w-full rounded-2xl transition-all duration-300 font-sans outline-none overflow-hidden",
  {
    variants: {
      variant: {
        default: 
          "bg-zinc-950 text-zinc-100 border border-zinc-900 shadow-sm",
        outline: 
          "bg-transparent text-zinc-100 border border-zinc-800/80",
        elevated: 
          "bg-zinc-950 text-zinc-100 border border-zinc-900 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]",
        glass: 
          "bg-zinc-950/40 text-zinc-100 border border-zinc-900/60 backdrop-blur-xl shadow-xl",
        gradient: 
          "bg-gradient-to-b from-zinc-900/80 to-zinc-950 text-zinc-100 border border-zinc-800/40 shadow-inner",
        enterprise: 
          "bg-[#050507] text-zinc-100 border border-zinc-900 shadow-[0_0_25px_rgba(255,255,255,0.01)] hover:border-zinc-800",
        analytics: 
          "bg-zinc-950 text-zinc-100 border border-zinc-900/80 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.02),transparent_50%)]",
        security: 
          "bg-zinc-950 text-zinc-100 border border-zinc-900/80 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.03),transparent_50%)]",
        success: 
          "bg-zinc-950 text-zinc-100 border border-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.02)]",
        warning: 
          "bg-zinc-950 text-zinc-100 border border-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.02)]",
        error: 
          "bg-zinc-950 text-zinc-100 border border-rose-500/10 shadow-[0_0_20px_rgba(239,68,68,0.02)]",
      },
      hoverEffect: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] hover:border-zinc-800",
        glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.03)] hover:border-amber-500/30",
        border: "hover:border-zinc-700/80",
      }
    },
    defaultVariants: {
      variant: "default",
      hoverEffect: "none",
    }
  }
);

export interface CardTelemetryPayload {
  cardId?: string;
  componentRole: "widget" | "analytics" | "agent" | "workflow" | "knowledge" | "security" | "billing";
  metricLabel?: string;
}

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>, 
    VariantProps<typeof cardVariants> {
  interactive?: boolean;
  selected?: boolean;
  loading?: boolean;
  expandable?: boolean;
  initiallyExpanded?: boolean;
  telemetry?: CardTelemetryPayload;
}

const dispatchCardTelemetry = (payload: CardTelemetryPayload, action: string) => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI CARD METRICS]: Interaction -> ${action.toUpperCase()} | Role: ${payload.componentRole} | Scope ID: ${payload.cardId ?? "UNCLASSIFIED"}`);
  }
  // External telemetry platform routing connects downstream
};

// ============================================================================
// ROOT HOOK CONFIGURATION FOR EXPANDABLE PERIMETERS
// ============================================================================

const CardContext = React.createContext<{ isExpanded: boolean; toggleExpand: () => void } | undefined>(undefined);

// ============================================================================
// ROOT COMPONENT IMPLEMENTATION
// ============================================================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hoverEffect, interactive = false, selected = false, loading = false, expandable = false, initiallyExpanded = false, telemetry, children, onClick, onKeyDown, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(initiallyExpanded);
    const toggleExpand = React.useCallback(() => setIsExpanded((prev) => !prev), []);

    const hasHover = interactive && hoverEffect === "none" ? "lift" : hoverEffect;

    const handleExecutionIntercept = (e: React.MouseEvent<HTMLDivElement>) => {
      if (loading) return;
      if (telemetry) dispatchCardTelemetry(telemetry, "click");
      if (expandable) toggleExpand();
      if (onClick) onClick(e);
    };

    const handleKeyboardIntercept = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (loading) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (telemetry) dispatchCardTelemetry(telemetry, "keyboard-activation");
        if (expandable) toggleExpand();
        // Simulate mouse trigger event alignment safely
        const mockEvent = { ...e, preventDefault: () => {}, stopPropagation: () => {} } as unknown as React.MouseEvent<HTMLDivElement>;
        if (onClick) onClick(mockEvent);
      }
    };

    React.useEffect(() => {
      if (telemetry) dispatchCardTelemetry(telemetry, "mount");
    }, [telemetry]);

    return (
      <CardContext.Provider value={{ isExpanded, toggleExpand }}>
        <motion.div
          ref={ref}
          role={interactive ? "button" : "region"}
          tabIndex={interactive ? 0 : undefined}
          aria-selected={selected ? true : undefined}
          aria-busy={loading ? true : undefined}
          onClick={handleExecutionIntercept}
          onKeyDown={handleKeyboardIntercept}
          className={cn(
            cardVariants({ variant, hoverEffect: hasHover, className }),
            selected && "border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.02)]",
            interactive && "cursor-pointer select-none"
          )}
          whileTap={interactive ? { scale: 0.992 } : undefined}
          {...props}
        >
          {/* Structural Selection Ring Graphic Overlay */}
          {selected && (
            <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-amber-500 rounded-bl-md z-30" />
          )}

          {/* Absolute Processing Loader Node Skeleton Shutter Block */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs z-50 flex items-center justify-center gap-2 font-mono text-[10px] tracking-widest text-zinc-400 uppercase"
              >
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span>Processing Stream Core</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-6 space-y-4">
            {expandable ? (
              <div className="space-y-4">
                {React.Children.map(children, (child) => {
                  if (React.isValidElement(child) && (child.type === CardHeader || child.type === CardContent)) {
                    return child;
                  }
                  return null;
                })}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden space-y-4"
                    >
                      {React.Children.map(children, (child) => {
                        if (React.isValidElement(child) && child.type !== CardHeader && child.type !== CardContent) {
                          return child;
                        }
                        return null;
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              children
            )}
          </div>
        </motion.div>
      </CardContext.Provider>
    );
  }
);
Card.displayName = "Card";

// ============================================================================
// SUBCOMPONENTS CONFIGURATIONS INTERFACES
// ============================================================================

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-start justify-between gap-4 w-full", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-sm font-mono font-black tracking-tight text-zinc-100 uppercase leading-none", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-zinc-500 font-sans leading-relaxed break-words", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-xs text-zinc-300 font-sans leading-relaxed w-full", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 pt-2 border-t border-zinc-900/60 font-mono text-[11px] text-zinc-500 w-full", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export const CardActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-1.5 shrink-0", className)} {...props} />
  )
);
CardActions.displayName = "CardActions";

// ============================================================================
// EXTENDED TELEMETRY ANALYTICS METRIC CONTROLLER MODULE
// ============================================================================

export interface CardMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  trend?: "up" | "down" | "neutral";
  percentage?: string | number;
  statusLabel?: string;
}

export const CardMetric = React.forwardRef<HTMLDivElement, CardMetricProps>(
  ({ className, value, trend, percentage, statusLabel, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1.5 py-1 w-full", className)} {...props}>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight font-mono text-zinc-100">
            {value}
          </span>
          {percentage && (
            <span className={cn(
              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border",
              trend === "up" && "bg-emerald-500/5 text-emerald-400 border-emerald-500/10",
              trend === "down" && "bg-rose-500/5 text-rose-400 border-rose-500/10",
              trend === "neutral" && "bg-zinc-900 text-zinc-500 border-zinc-800"
            )}>
              {trend === "up" && <TrendingUp className="h-2.5 w-2.5" />}
              {trend === "down" && <TrendingDown className="h-2.5 w-2.5" />}
              <span>{percentage}</span>
            </span>
          )}
        </div>
        {statusLabel && (
          <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 block">
            {statusLabel}
          </span>
        )}
      </div>
    );
  }
);
CardMetric.displayName = "CardMetric";

// ============================================================================
// EXTENDED METADATA CONTEXT BADGE OVERLAY PANEL
// ============================================================================

export interface CardBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "premium";
}

export const CardBadge = React.forwardRef<HTMLSpanElement, CardBadgeProps>(
  ({ className, variant = "neutral", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase border",
          variant === "success" && "bg-emerald-500/5 text-emerald-400 border-emerald-500/20",
          variant === "warning" && "bg-amber-500/5 text-amber-400 border-amber-500/20",
          variant === "error" && "bg-rose-500/5 text-rose-400 border-rose-500/20",
          variant === "info" && "bg-blue-500/5 text-blue-400 border-blue-500/20",
          variant === "neutral" && "bg-zinc-900 text-zinc-400 border-zinc-800",
          variant === "premium" && "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/20",
          className
        )}
        {...props}
      />
    );
  }
);
CardBadge.displayName = "CardBadge";