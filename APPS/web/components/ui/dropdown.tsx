"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SYSTEM DESIGN TOKENS & VARIANT ARCHITECTURE (CVA)
// ============================================================================

const contentVariants = cva(
  "absolute z-50 min-w-[220px] rounded-xl border border-zinc-900 bg-zinc-950 p-1.5 text-zinc-100 shadow-xl backdrop-blur-md outline-none origin-top flex flex-col gap-0.5 select-none",
  {
    variants: {
      variant: {
        default: "border-zinc-900 bg-zinc-950/95 shadow-zinc-950/80",
        enterprise: "border-zinc-800 bg-[#050507]/98 shadow-[0_0_30px_rgba(0,0,0,0.8)]",
        glass: "border-zinc-800/40 bg-zinc-950/75 backdrop-blur-xl shadow-2xl",
      }
    },
    defaultVariants: {
      variant: "default",
    }
  }
);

const itemVariants = cva(
  "group relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-400 outline-none transition-all duration-150 data-[disabled]:pointer-events-none data-[disabled]:opacity-35 data-[focus]:bg-zinc-900 data-[focus]:text-zinc-100 data-[active]:scale-[0.99]",
  {
    variants: {
      intent: {
        default: "data-[focus]:bg-zinc-900 data-[focus]:text-zinc-100",
        danger: "text-rose-400/90 data-[focus]:bg-rose-950/40 data-[focus]:text-rose-200",
        success: "text-emerald-400/90 data-[focus]:bg-emerald-950/40 data-[focus]:text-emerald-200",
      }
    },
    defaultVariants: {
      intent: "default",
    }
  }
);

export type DropdownVariants = VariantProps<typeof contentVariants>;

export interface DropdownTelemetryPayload {
  menuId?: string;
  trackingContext: "workspace" | "user" | "agent" | "workflow" | "knowledge-base";
}

// Global analytics reporting proxy hook mapping pipeline
const dispatchDropdownTelemetry = (payload: DropdownTelemetryPayload, itemLabel: string) => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI DROPDOWN METRICS]: ITEM_TRIGGER | Context: ${payload.trackingContext} | Menu: ${payload.menuId ?? "UNCLASSIFIED"} | Action: "${itemLabel}"`);
  }
};

// ============================================================================
// SYSTEM ARCHITECTURE CONTEXT DIRECTORIES
// ============================================================================

interface DropdownContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  variant: DropdownVariants["variant"];
  position: "top" | "bottom" | "left" | "right";
  alignment: "start" | "center" | "end";
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  telemetry?: DropdownTelemetryPayload;
}

const DropdownContext = React.createContext<DropdownContextProps | undefined>(undefined);

const useDropdown = () => {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("CAT AI Dropdown components must be initialized inside a <Dropdown /> state orchestrator node.");
  return context;
};

// ============================================================================
// SYSTEM COMPONENT IMPLEMENTATION: MASTER DISPATCHER ROOT
// ============================================================================

export interface DropdownProps {
  variant?: DropdownVariants["variant"];
  position?: "top" | "bottom" | "left" | "right";
  alignment?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  telemetry?: DropdownTelemetryPayload;
  children: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  variant = "default",
  position = "bottom",
  alignment = "start",
  open: controlledOpen,
  onOpenChange,
  telemetry,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const setIsOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      if (onOpenChange) onOpenChange(nextOpen);
      if (!nextOpen) setActiveIndex(-1);
    },
    [isControlled, onOpenChange]
  );

  // Structural outside click interception loop boundary layer
  React.useEffect(() => {
    if (!isOpen) return;

    const handleOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node;
      if (
        triggerRef.current?.contains(targetNode) ||
        contentRef.current?.contains(targetNode)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction);
    return () => {
      document.addEventListener("mousedown", handleOutsideInteraction);
      document.addEventListener("touchstart", handleOutsideInteraction);
    };
  }, [isOpen, setIsOpen]);

  const contextValue = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      triggerRef,
      contentRef,
      variant,
      position,
      alignment,
      activeIndex,
      setActiveIndex,
      telemetry,
    }),
    [isOpen, setIsOpen, variant, position, alignment, activeIndex, setActiveIndex, telemetry]
  );

  return <DropdownContext.Provider value={contextValue}>{children}</DropdownContext.Provider>;
};

// ============================================================================
// SYSTEM MAPPING EMITTER: THE TRIGGER COMPONENT NODE
// ============================================================================

export interface DropdownTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export const DropdownTrigger = React.forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ asChild, children }, ref) => {
    const { isOpen, setIsOpen, triggerRef, contentRef } = useDropdown();

    const handleToggleActionIntercept = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsOpen(!isOpen);
    };

    const handleKeyDownIntercept = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        // Force synchronous layout engine render deferral mapping pass macro task focus loop
        setTimeout(() => {
          const firstItem = contentRef.current?.querySelector('[role^="menuitem"]:not([data-disabled])') as HTMLElement;
          firstItem?.focus();
        }, 50);
      }
    };

    const combinedRef = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref: combinedRef,
        onClick: (e: React.MouseEvent) => {
          handleToggleActionIntercept(e);
          if ((children.props as { onClick?: (e: React.MouseEvent) => void }).onClick) {
            (children.props as { onClick: (e: React.MouseEvent) => void }).onClick(e);
          }
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
          handleKeyDownIntercept(e);
          if ((children.props as { onKeyDown?: (e: React.KeyboardEvent) => void }).onKeyDown) {
            (children.props as { onKeyDown: (e: React.KeyboardEvent) => void }).onKeyDown(e);
          }
        },
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
      } as React.Attributes & typeof children.props);
    }

    return (
      <button
        ref={combinedRef}
        type="button"
        onClick={handleToggleActionIntercept}
        onKeyDown={handleKeyDownIntercept}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
      >
        {children}
      </button>
    );
  }
);
DropdownTrigger.displayName = "DropdownTrigger";

// ============================================================================
// SYSTEM SHELL CONTAINER: CONTENT MATRIX REALIZATION ENGINE
// ============================================================================

export const DropdownContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, variant, position, alignment, contentRef, triggerRef } = useDropdown();

    // Geometric Spatial Co-ordinate Position Vector Mapping Transform Matrix
    const computedCoordinatesStyle = React.useMemo(() => {
      if (!triggerRef.current && typeof window === "undefined") return {};
      
      const offsets = { top: "bottom-[105%] mb-1", bottom: "top-[105%] mt-1", left: "right-[105%] mr-1", right: "left-[105%] ml-1" };
      const aligns = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" };

      if (position === "left" || position === "right") {
        const structuralVerticalAligns = { start: "top-0", center: "top-1/2 -translate-y-1/2", end: "bottom-0" };
        return `${offsets[position]} ${structuralVerticalAligns[alignment]}`;
      }

      return `${offsets[position]} ${aligns[alignment]}`;
    }, [position, alignment, triggerRef, isOpen]);

    // Focus Trap Cyclic Intercept Key Transversal Execution Engine
    const handleKeyDownEngine = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!contentRef.current) return;

      const items = Array.from(
        contentRef.current.querySelectorAll('[role^="menuitem"]:not([data-disabled])')
      ) as HTMLElement[];

      if (items.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const index = items.indexOf(activeElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = (index + 1) % items.length;
          items[nextIndex]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevIndex = (index - 1 + items.length) % items.length;
          items[prevIndex]?.focus();
          break;
        case "Escape":
        case "Tab":
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        default:
          break;
      }
    };

    const combinedRef = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <div className={cn("absolute", computedCoordinatesStyle)}>
            <motion.div
              ref={combinedRef}
              role="menu"
              aria-orientation="vertical"
              tabIndex={-1}
              onKeyDown={handleKeyDownEngine}
              className={cn(contentVariants({ variant, className }))}
              initial={{ opacity: 0, scale: 0.98, y: position === "bottom" ? -4 : 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: position === "bottom" ? -4 : 4 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              {...props}
            >
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);
DropdownContent.displayName = "DropdownContent";

// ============================================================================
// ATOMIC MATRIX INTERACTION LEAF SEGMENT: STANDARD ITEM NODE
// ============================================================================

export interface DropdownItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">,
    VariantProps<typeof itemVariants> {
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onClick?: (e: MouseEvent | KeyboardEvent) => void | Promise<void>;
}

export const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ className, intent, disabled, loading, leadingIcon, trailingIcon, children, onClick, ...props }, ref) => {
    const { setIsOpen, triggerRef, telemetry } = useDropdown();

    const handleExecutionIntercept = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || loading) return;
      
      const nativeLabelText = typeof children === "string" ? children : "Structured DOM Subtree Node Element";
      if (telemetry) dispatchDropdownTelemetry(telemetry, nativeLabelText);

      if (onClick) {
        onClick(e.nativeEvent);
      }
      
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? undefined : -1}
        data-disabled={disabled ? "" : undefined}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.focus();
        }}
        onClick={handleExecutionIntercept}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleExecutionIntercept(e);
          }
        }}
        className={cn(itemVariants({ intent, className }))}
        {...props}
      >
        {loading ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-zinc-500" />
        ) : (
          leadingIcon && <span className="mr-2 flex h-3.5 w-3.5 items-center justify-center shrink-0 opacity-70 group-data-[focus]:opacity-100 transition-opacity">{leadingIcon}</span>
        )}
        
        <span className="flex-1 text-left">{children}</span>
        
        {trailingIcon && (
          <span className="ml-auto pl-2 text-[10px] font-mono tracking-widest text-zinc-600 group-data-[focus]:text-zinc-400 select-none">
            {trailingIcon}
          </span>
        )}
      </div>
    );
  }
);
DropdownItem.displayName = "DropdownItem";

// ============================================================================
// STRUCTURAL DIVISION AND METADATA LABELLING HOOKS
// ============================================================================

export const DropdownLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2.5 py-1.5 text-[10px] font-mono font-black tracking-wider text-zinc-500 uppercase select-none", className)}
      {...props}
    />
  )
);
DropdownLabel.displayName = "DropdownLabel";

export const DropdownSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1.5 my-1 h-px bg-zinc-900/80 border-none", className)}
      {...props}
    />
  )
);
DropdownSeparator.displayName = "DropdownSeparator";

export const DropdownGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} role="group" className={cn("flex flex-col gap-0.5", className)} {...props} />
  )
);
DropdownGroup.displayName = "DropdownGroup";

// ============================================================================
// REACTION CONTROLLERS: CHECKBOX ELEMENT PRIMITIVE MATRIX
// ============================================================================

export interface DropdownCheckboxItemProps extends DropdownItemProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const DropdownCheckboxItem = React.forwardRef<HTMLDivElement, DropdownCheckboxItemProps>(
  ({ checked = false, onCheckedChange, children, onClick, ...props }, ref) => {
    const handleCheckboxToggle = (e: MouseEvent | KeyboardEvent) => {
      if (onCheckedChange) onCheckedChange(!checked);
      if (onClick) onClick(e);
    };

    return (
      <DropdownItem
        ref={ref}
        onClick={handleCheckboxToggle}
        className={cn("pl-8", props.className)}
        {...props}
      >
        <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
          <AnimatePresence initial={false}>
            {checked && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <Check className="h-3.5 w-3.5 text-zinc-100" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        {children}
      </DropdownItem>
    );
  }
);
DropdownCheckboxItem.displayName = "DropdownCheckboxItem";

// ============================================================================
// REACTION CONTROLLERS: RADIO BUTTON SELECTION MATRICES
// ============================================================================

export interface DropdownRadioItemProps extends DropdownItemProps {
  value: string;
  selectedValue?: string;
  onValueChange?: (value: string) => void;
}

export const DropdownRadioItem = React.forwardRef<HTMLDivElement, DropdownRadioItemProps>(
  ({ value, selectedValue, onValueChange, children, onClick, ...props }, ref) => {
    const isSelected = value === selectedValue;

    const handleRadioSelect = (e: MouseEvent | KeyboardEvent) => {
      if (onValueChange) onValueChange(value);
      if (onClick) onClick(e);
    };

    return (
      <DropdownItem
        ref={ref}
        onClick={handleRadioSelect}
        className={cn("pl-8", props.className)}
        {...props}
      >
        <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
          <AnimatePresence initial={false}>
            {isSelected && (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <Circle className="h-2 w-2 fill-zinc-100 text-zinc-100" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        {children}
      </DropdownItem>
    );
  }
);
DropdownRadioItem.displayName = "DropdownRadioItem";

// ============================================================================
// ADVANCED RECURSION TREE LAYER: NESTED CASCADING SUBMENUS
// ============================================================================

export interface DropdownSubmenuProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
}

export const DropdownSubmenu: React.FC<DropdownSubmenuProps> = ({
  label,
  disabled,
  leadingIcon,
  className,
  children,
  ...props
}) => {
  const [isSubOpen, setIsSubOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleSubMenuHoverClose = (e: MouseEvent) => {
      if (!element.contains(e.target as Node)) {
        setIsSubOpen(false);
      }
    };

    document.addEventListener("mouseover", handleSubMenuHoverClose);
    return () => {
      document.removeEventListener("mouseover", handleSubMenuHoverClose);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseEnter={() => !disabled && setIsSubOpen(true)}
      onMouseLeave={() => !disabled && setIsSubOpen(false)}
      {...props}
    >
      <div
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isSubOpen}
        data-disabled={disabled ? "" : undefined}
        className={cn(
          itemVariants(),
          "pr-2 data-[focus]:bg-zinc-900 data-[focus]:text-zinc-100",
          isSubOpen && "bg-zinc-900 text-zinc-100"
        )}
      >
        {leadingIcon && <span className="mr-2 flex h-3.5 w-3.5 items-center justify-center shrink-0 opacity-70">{leadingIcon}</span>}
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60" />
      </div>

      <AnimatePresence>
        {isSubOpen && (
          <motion.div
            role="menu"
            className={cn(
              contentVariants(),
              "absolute left-[99%] top-0 ml-1 origin-left",
              className
            )}
            initial={{ opacity: 0, scale: 0.97, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.97, x: -4 }}
            transition={{ duration: 0.1 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
DropdownSubmenu.displayName = "DropdownSubmenu";