"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Cpu, Database, Network, Shield, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// DESIGN SYSTEM TOKENS & VARIANT ARCHITECTURE (CVA)
// ============================================================================

const avatarVariants = cva(
  "relative flex shrink-0 select-none items-center justify-center border transition-all duration-300 bg-zinc-950 text-zinc-200 outline-none",
  {
    variants: {
      size: {
        xs: "h-5 w-5 text-[9px] font-bold rounded-md",
        sm: "h-7 w-7 text-[11px] font-bold rounded-lg",
        md: "h-10 w-10 text-xs font-bold rounded-xl",
        lg: "h-12 w-12 text-sm font-bold rounded-2xl",
        xl: "h-16 w-16 text-base font-bold rounded-[18px]",
        "2xl": "h-20 w-20 text-lg font-bold rounded-[22px]",
        "3xl": "h-24 w-24 text-xl font-bold rounded-[28px]",
      },
      shape: {
        square: "rounded-xl",
        circle: "rounded-full",
        workspace: "rounded-[24%] rotate-0 hover:rounded-xl transition-all duration-300",
      },
      ring: {
        none: "border-zinc-900/80",
        primary: "border-zinc-800 ring-2 ring-zinc-950 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950",
        success: "border-emerald-500/30 ring-2 ring-zinc-950 ring-offset-2 ring-offset-emerald-500/20",
        warning: "border-amber-500/30 ring-2 ring-zinc-950 ring-offset-2 ring-offset-amber-500/20",
        premium: "border-transparent bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-purple-950/20",
      }
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
      ring: "none",
    }
  }
);

export type AvatarSizes = NonNullable<VariantProps<typeof avatarVariants>["size"]>;
export type AvatarShapes = NonNullable<VariantProps<typeof avatarVariants>["shape"]>;

export type PresenceType = "Online" | "Offline" | "Busy" | "Away" | "Processing" | "Maintenance" | "Error";

export interface AvatarTelemetryPayload {
  entityId?: string;
  entityType: "user" | "agent" | "team" | "workspace" | "organization" | "system";
  workspaceId?: string;
}

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  presence?: PresenceType;
  showPresenceIndicator?: boolean;
  isTyping?: boolean;
  telemetry?: AvatarTelemetryPayload;
}

const dispatchAvatarTelemetry = (payload: AvatarTelemetryPayload, actionName: "click" | "view" | "presence_change") => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI AVATAR METRICS]: ${actionName.toUpperCase()} | Type: ${payload.entityType} | ID: ${payload.entityId ?? "UNCLASSIFIED"}`);
  }
};

// ============================================================================
// CORE COMPONENT IMPLEMENTATION
// ============================================================================

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      size = "md",
      shape = "circle",
      ring = "none",
      presence,
      showPresenceIndicator = false,
      isTyping = false,
      telemetry,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const handleExecutionIntercept = (e: React.MouseEvent<HTMLDivElement>) => {
      if (telemetry) dispatchAvatarTelemetry(telemetry, "click");
      if (onClick) onClick(e);
    };

    React.useEffect(() => {
      if (telemetry) dispatchAvatarTelemetry(telemetry, "view");
    }, [telemetry]);

    // Strategic Presence Indicator Layout Map Engine
    const presenceColor = React.useMemo(() => {
      switch (presence) {
        case "Online": return "bg-emerald-500";
        case "Away": return "bg-amber-500";
        case "Busy": return "bg-rose-500";
        case "Processing": return "bg-blue-500 shadow-blue-500/50 animate-pulse";
        case "Maintenance": return "bg-purple-500";
        case "Error": return "bg-red-600 animate-bounce";
        case "Offline":
        default: return "bg-zinc-600";
      }
    }, [presence]);

    // Positioning offset logic based matrix variables for shapes/sizes
    const indicatorSizeClass = size === "xs" || size === "sm" ? "h-2 w-2" : size === "md" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
    const indicatorPositionClass = shape === "circle" ? "bottom-0 right-0" : "bottom-[-2px] right-[-2px]";

    return (
      <div className="relative inline-block shrink-0 group/avatar">
        <AvatarPrimitive.Root
          ref={ref}
          onClick={handleExecutionIntercept}
          className={cn(avatarVariants({ size, shape, ring, className }), onClick && "cursor-pointer active:scale-95")}
          {...props}
        >
          {/* Internal Gradient Ring Inner Shell for Premium Variant */}
          {ring === "premium" && (
            <div className={cn("absolute inset-0 bg-zinc-950 p-[1px] z-0", shape === "circle" ? "rounded-full" : "rounded-xl")} />
          )}
          <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit]">
            {children}
          </div>
        </AvatarPrimitive.Root>

        {/* Typing Indicators Vector Rendering Track */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 z-30 flex items-center gap-0.5 rounded-full bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 shadow-xl"
            >
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Status Presence Badge Node Overlay */}
        {showPresenceIndicator && presence && !isTyping && (
          <span className={cn("absolute z-20 rounded-full ring-2 ring-zinc-950 block", presenceColor, indicatorSizeClass, indicatorPositionClass)}>
            {presence === "Processing" && (
              <span className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />
            )}
          </span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

// ============================================================================
// PRIMITIVE IMAGE COMPONENTS REF MAPS
// ============================================================================

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    loading="lazy"
    className={cn("aspect-square h-full w-full object-cover rounded-[inherit]", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// ============================================================================
// SYSTEM INTELLIGENT FALLBACK MATRIX GENERATORS
// ============================================================================

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  fallbackText?: string;
  fallbackIcon?: "user" | "bot" | "workspace" | "network" | "database" | "security";
  seedString?: string; // Deterministic background calculation node anchor
}

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, fallbackText, fallbackIcon, seedString, ...props }, ref) => {
    const computedInitials = React.useMemo(() => {
      if (!fallbackText) return "";
      return fallbackText
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }, [fallbackText]);

    // Deterministic Premium Workspace Backdrop Hashing Color Node Pipeline
    const computedBackground = React.useMemo(() => {
      if (!seedString) return "bg-zinc-900 text-zinc-400";
      const colors = [
        "bg-rose-950/40 text-rose-300 border-rose-900/40",
        "bg-emerald-950/40 text-emerald-300 border-emerald-900/40",
        "bg-amber-950/40 text-amber-300 border-amber-900/40",
        "bg-blue-950/40 text-blue-300 border-blue-900/40",
        "bg-indigo-950/40 text-indigo-300 border-indigo-900/40",
        "bg-purple-950/40 text-purple-300 border-purple-900/40",
        "bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-900/40",
      ];
      let hash = 0;
      for (let i = 0; i < seedString.length; i++) {
        hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    }, [seedString]);

    return (
      <AvatarPrimitive.Fallback
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-[inherit] font-mono border border-zinc-800/60 select-none uppercase",
          computedBackground,
          className
        )}
        {...props}
      >
        {fallbackIcon ? (
          fallbackIcon === "bot" ? <Bot className="h-[45%] w-[45%]" /> :
          fallbackIcon === "workspace" ? <Terminal className="h-[45%] w-[45%]" /> :
          fallbackIcon === "database" ? <Database className="h-[45%] w-[45%]" /> :
          fallbackIcon === "security" ? <Shield className="h-[45%] w-[45%]" /> :
          fallbackIcon === "network" ? <Network className="h-[45%] w-[45%]" /> :
          <Sparkles className="h-[45%] w-[45%]" />
        ) : (
          <span>{computedInitials}</span>
        )}
      </AvatarPrimitive.Fallback>
    );
  }
);
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// ============================================================================
// COLLABORATOR TEAM AGGREGATION WRAPPERS: STACK / GROUP
// ============================================================================

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  maxVisible?: number;
  size?: AvatarSizes;
  shape?: AvatarShapes;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ children, maxVisible = 4, size = "md", shape = "circle", className, ...props }) => {
  const childrenArray = React.Children.toArray(children);
  const visibleAvatars = childrenArray.slice(0, maxVisible);
  const overflowCount = childrenArray.length - maxVisible;

  const overlapSpacingClass = size === "xs" || size === "sm" ? "-space-x-1.5" : size === "md" ? "-space-x-3" : "-space-x-4";

  return (
    <div className={cn("flex items-center justify-start isolate", overlapSpacingClass, className)} {...props}>
      {visibleAvatars.map((child, idx) => {
        if (!React.isValidElement(child)) return null;
        return React.cloneElement(child, {
          // Pass spatial context downstream seamlessly to subcomponents configuration mapping vectors
          size,
          shape,
          className: cn((child.props as { className?: string }).className, "ring-2 ring-zinc-950 relative hover:z-30 transition-all duration-200 hover:scale-105"),
          style: { zIndex: visibleAvatars.length - idx }
        } as React.Attributes & typeof child.props);
      })}

      {overflowCount > 0 && (
        <div
          className={cn(
            avatarVariants({ size, shape }),
            "bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono ring-2 ring-zinc-950 font-black tracking-tighter z-0 flex items-center justify-center shadow-2xl uppercase"
          )}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

// Backwards-compatible architecture alias pattern mapping interface layout
export const AvatarStack = AvatarGroup;

// ============================================================================
// SYSTEM SPECIFIC DERIVATIVES MAPPED OUTLETS (AGENT, WORKSPACE, STATUS)
// ============================================================================

export interface AgentAvatarProps extends Omit<AvatarProps, "shape"> {
  role: "Research" | "Analytics" | "Workflow" | "Coordinator" | "Knowledge";
  src?: string;
  alt?: string;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({ role, src, alt, ring = "none", presence = "Online", ...props }) => {
  const fallbackIcon = React.useMemo(() => {
    switch (role) {
      case "Knowledge": return "database" as const;
      case "Workflow": return "network" as const;
      case "Analytics": return "security" as const;
      case "Coordinator": return "user" as const;
      case "Research":
      default: return "bot" as const;
    }
  }, [role]);

  const internalRing = presence === "Processing" ? ("premium" as const) : ring;

  return (
    <Avatar shape="square" ring={internalRing} presence={presence} showPresenceIndicator={true} {...props}>
      <AvatarImage src={src} alt={alt ?? `${role} Intelligent Deployment Node`} />
      <AvatarFallback fallbackIcon={fallbackIcon} seedString={role} />
    </Avatar>
  );
};

export interface WorkspaceAvatarProps extends Omit<AvatarProps, "shape"> {
  name: string;
  src?: string;
}

export const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({ name, src, ...props }) => {
  return (
    <Avatar shape="workspace" ring="none" {...props}>
      <AvatarImage src={src} alt={`${name} Platform Workspace Environment`} />
      <AvatarFallback fallbackText={name} seedString={name} />
    </Avatar>
  );
};

export interface OrganizationAvatarProps extends Omit<AvatarProps, "shape"> {
  companyName: string;
  src?: string;
}

export const OrganizationAvatar: React.FC<OrganizationAvatarProps> = ({ companyName, src, ...props }) => {
  return (
    <Avatar shape="square" ring="primary" {...props}>
      <AvatarImage src={src} alt={`${companyName} Tenant Enterprise Core Node`} />
      <AvatarFallback fallbackText={companyName} fallbackIcon="network" />
    </Avatar>
  );
};

export interface StatusAvatarProps extends AvatarProps {
  userDisplayName: string;
  src?: string;
}

export const StatusAvatar: React.FC<StatusAvatarProps> = ({ userDisplayName, src, presence = "Offline", ...props }) => {
  return (
    <Avatar shape="circle" presence={presence} showPresenceIndicator={true} {...props}>
      <AvatarImage src={src} alt={userDisplayName} />
      <AvatarFallback fallbackText={userDisplayName} seedString={userDisplayName} />
    </Avatar>
  );
};