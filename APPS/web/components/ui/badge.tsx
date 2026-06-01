"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Star, ShieldAlert, Zap, Activity, Info, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// DESIGN SYSTEM TOKENS & VARIANT ARCHITECTURE (CVA)
// ============================================================================

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none border whitespace-nowrap outline-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-zinc-300 border-zinc-800",
        primary:
          "bg-zinc-100 text-zinc-950 border-zinc-200 shadow-sm",
        secondary:
          "bg-zinc-800 text-zinc-200 border-zinc-700/60",
        success:
          "bg-emerald-950/40 text-emerald-400 border-emerald-500/20",
        warning:
          "bg-amber-950/40 text-amber-400 border-amber-500/20",
        error:
          "bg-rose-950/40 text-rose-400 border-rose-500/20",
        destructive:
          "bg-red-600 text-white border-transparent hover:bg-red-700",
        outline:
          "bg-transparent text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700",
        ghost:
          "bg-transparent text-zinc-500 border-transparent hover:bg-zinc-900/50 hover:text-zinc-300",
        glass:
          "bg-zinc-950/40 text-zinc-200 border-zinc-900/80 backdrop-blur-md shadow-inner",
        enterprise:
          "bg-[#050507] text-zinc-300 border-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.01)] hover:border-zinc-800",
        gradient:
          "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 text-purple-300 border-purple-500/20",
      },
      size: {
        sm: "h-4 px-2 text-[9px] tracking-tight gap-1",
        md: "h-5 px-2.5 text-[10px]",
        lg: "h-6 px-3 text-[11px] tracking-wide gap-2",
      },
      interactive: {
        true: "cursor-pointer active:scale-95",
        false: "pointer-events-none"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
    }
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
export type BadgeSizes = NonNullable<BadgeVariants["size"]>;

export interface BadgeTelemetryPayload {
  badgeId?: string;
  context: "agent-status" | "workflow-status" | "user-role" | "billing" | "analytics" | "notifications";
  metadata?: Record<string, unknown>;
}

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "id">,
    VariantProps<typeof badgeVariants> {
  id?: string;
  icon?: React.ReactNode;
  count?: number;
  maxCount?: number;
  showPulse?: boolean;
  pulseColor?: string;
  closable?: boolean;
  onClose?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  telemetry?: BadgeTelemetryPayload;
  ariaLabel?: string;
}

// Global instrumentation pipeline proxy interface
const dispatchBadgeTelemetry = (payload: BadgeTelemetryPayload, actionName: "click" | "filter_applied" | "dismiss") => {
  if (process.env.NODE_ENV === "development") {
    console.groupCollapsed(`[CAT AI BADGE TELEMETRY]: ${actionName.toUpperCase()}`);
    console.log(`Context Scope: ${payload.context}`);
    console.log(`Identity Core: ${payload.badgeId ?? "UNCLASSIFIED"}`);
    if (payload.metadata) console.log(`Payload Metadata:`, payload.metadata);
    console.groupEnd();
  }
};

// ============================================================================
// MODULE COMPONENT IMPLEMENTATION: BASE BADGE
// ============================================================================

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      interactive,
      id,
      icon,
      count,
      maxCount = 99,
      showPulse = false,
      pulseColor = "bg-current",
      closable = false,
      onClose,
      telemetry,
      ariaLabel,
      children,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const hasClickTrigger = !!onClick || !!interactive;

    const handleExecutionIntercept = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (telemetry) dispatchBadgeTelemetry(telemetry, "click");
      if (onClick) onClick(e);
    };

    const handleKeyboardIntercept = (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (telemetry) dispatchBadgeTelemetry(telemetry, "click");
        const mockClickEvent = e as unknown as React.MouseEvent<HTMLSpanElement>;
        if (onClick) onClick(mockClickEvent);
      }
    };

    const handleDismissalIntercept = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (telemetry) dispatchBadgeTelemetry(telemetry, "dismiss");
      if (onClose) onClose(e);
    };

    const renderedCount = count !== undefined ? (count > maxCount ? `${maxCount}+` : count) : null;

    return (
      <span
        ref={ref}
        id={id}
        role={hasClickTrigger ? "button" : "status"}
        tabIndex={hasClickTrigger ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={hasClickTrigger ? handleExecutionIntercept : undefined}
        onKeyDown={hasClickTrigger ? handleKeyboardIntercept : undefined}
        className={cn(badgeVariants({ variant, size, interactive: hasClickTrigger, className }))}
        {...props}
      >
        {/* Real-time Status Pulse Indicator Dot Element */}
        {showPulse && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", pulseColor)} />
            <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", pulseColor)} />
          </span>
        )}

        {icon && <span className="shrink-0 opacity-80">{icon}</span>}

        {children && <span className="leading-none">{children}</span>}

        {/* Count Matrix Badge Parameter Overlay Render */}
        {renderedCount !== null && (
          <span className="ml-0.5 px-1 py-0.2 rounded-md bg-zinc-950/40 text-[9px] font-black border border-zinc-900/20 shadow-inner leading-none min-w-[12px] text-center">
            {renderedCount}
          </span>
        )}

        {/* Closable Shutter Action Interaction Anchor Node */}
        {closable && (
          <button
            type="button"
            onClick={handleDismissalIntercept}
            className="rounded-full p-0.5 hover:bg-zinc-950/40 text-current transition-colors focus:outline-none focus:ring-1 focus:ring-current/40 ml-0.5 -mr-1"
            aria-label="Remove filter entity"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </span>
    );
  }
);
Badge.displayName = "Badge";

// ============================================================================
// SPECIALIZED VARIANT MATRIX: STATUS OPERATIONAL BADGES
// ============================================================================

export type RuntimeStatusState = 
  | "Online" | "Offline" | "Running" | "Paused" 
  | "Failed" | "Completed" | "Pending" | "Processing";

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: RuntimeStatusState;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, ...props }) => {
  const config = React.useMemo(() => {
    switch (status) {
      case "Online":
      case "Completed":
        return { variant: "success" as const, showPulse: true, pulseColor: "bg-emerald-400" };
      case "Running":
      case "Processing":
        return { variant: "gradient" as const, showPulse: true, pulseColor: "bg-purple-400" };
      case "Paused":
      case "Pending":
        return { variant: "warning" as const, showPulse: false, pulseColor: "bg-amber-400" };
      case "Failed":
        return { variant: "error" as const, showPulse: true, pulseColor: "bg-rose-500" };
      case "Offline":
      default:
        return { variant: "default" as const, showPulse: false, pulseColor: "bg-zinc-500" };
    }
  }, [status]);

  return (
    <Badge 
      variant={config.variant} 
      showPulse={config.showPulse} 
      pulseColor={config.pulseColor} 
      {...props}
    >
      {status}
    </Badge>
  );
};

// ============================================================================
// SPECIALIZED VARIANT MATRIX: SECURITY AUTH ROLE BADGES
// ============================================================================

export type EnterpriseRoles = "Owner" | "Admin" | "Manager" | "Editor" | "Viewer" | "Guest";

export interface RoleBadgeProps extends Omit<BadgeProps, "children"> {
  role: EnterpriseRoles;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, ...props }) => {
  const config = React.useMemo(() => {
    switch (role) {
      case "Owner":
        return { variant: "enterprise" as const, icon: <Shield className="h-3 w-3 text-amber-400" /> };
      case "Admin":
        return { variant: "primary" as const, icon: <Shield className="h-3 w-3 text-zinc-950" /> };
      case "Manager":
        return { variant: "secondary" as const, icon: <Star className="h-3 w-3 text-purple-400" /> };
      case "Editor":
        return { variant: "default" as const, icon: null };
      case "Viewer":
      case "Guest":
      default:
        return { variant: "outline" as const, icon: null };
    }
  }, [role]);

  return (
    <Badge variant={config.variant} icon={config.icon} {...props}>
      {role}
    </Badge>
  );
};

// ============================================================================
// SPECIALIZED VARIANT MATRIX: TIER SUBSCRIPTION PLAN BADGES
// ============================================================================

export type CommercialPlans = "Free" | "Developer" | "Business" | "Enterprise" | "Custom";

export interface PlanBadgeProps extends Omit<BadgeProps, "children"> {
  plan: CommercialPlans;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, ...props }) => {
  const variant = plan === "Enterprise" ? "enterprise" : plan === "Business" ? "gradient" : plan === "Developer" ? "primary" : "outline";
  const icon = plan === "Enterprise" || plan === "Business" ? <Zap className="h-3 w-3 animate-pulse" /> : undefined;

  return (
    <Badge variant={variant} icon={icon} {...props}>
      {plan}
    </Badge>
  );
};

// ============================================================================
// SPECIALIZED VARIANT MATRIX: OPERATIONAL PRIORITY BADGES
// ============================================================================

export type ExecutionPriority = "Critical" | "High" | "Medium" | "Low";

export interface PriorityBadgeProps extends Omit<BadgeProps, "children"> {
  priority: ExecutionPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, ...props }) => {
  const config = React.useMemo(() => {
    switch (priority) {
      case "Critical": return { variant: "error" as const, icon: <ShieldAlert className="h-3 w-3" /> };
      case "High": return { variant: "warning" as const, icon: <AlertTriangle className="h-3 w-3" /> };
      case "Medium": return { variant: "default" as const, icon: <Circle className="h-2 w-2 fill-current" /> };
      case "Low":
      default: return { variant: "outline" as const, icon: null };
    }
  }, [priority]);

  return (
    <Badge variant={config.variant} icon={config.icon} {...props}>
      {priority}
    </Badge>
  );
};

// ============================================================================
// SPECIALIZED VARIANT MATRIX: REAL-TIME TELEMETRY METRIC BADGES
// ============================================================================

export interface MetricBadgeProps extends BadgeProps {
  label: string;
  value: string | number;
}

export const MetricBadge: React.FC<MetricBadgeProps> = ({ label, value, variant = "glass", ...props }) => {
  return (
    <Badge variant={variant} className="gap-0 px-1 py-0" {...props}>
      <span className="opacity-50 font-sans font-normal border-r border-zinc-800 pr-1.5 mr-1.5 uppercase tracking-normal py-0.5">{label}</span>
      <span className="font-bold text-zinc-100">{value}</span>
    </Badge>
  );
};

// ============================================================================
// SPECIALIZED VARIANT MATRIX: CORE INFRASTRUCTURE HEALTH BADGES
// ============================================================================

export type InfrastructureHealth = "High Performance" | "Healthy" | "Stable" | "Warning" | "Critical";

export interface HealthBadgeProps extends Omit<BadgeProps, "children"> {
  health: InfrastructureHealth;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ health, ...props }) => {
  const config = React.useMemo(() => {
    switch (health) {
      case "High Performance": return { variant: "gradient" as const, icon: <Zap className="h-3 w-3" /> };
      case "Healthy":
      case "Stable": return { variant: "success" as const, icon: <Activity className="h-3 w-3" /> };
      case "Warning": return { variant: "warning" as const, icon: <AlertTriangle className="h-3 w-3" /> };
      case "Critical":
      default: return { variant: "error" as const, icon: <ShieldAlert className="h-3 w-3" /> };
    }
  }, [health]);

  return (
    <Badge variant={config.variant} icon={config.icon} {...props}>
      {health}
    </Badge>
  );
};