"use client";

import * as React from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingArrow,
  arrow,
  type Placement,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// CONTEXT & TYPES
// ============================================================================

interface TooltipContext {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const TooltipContext = React.createContext<TooltipContext | undefined>(undefined);

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// ============================================================================
// PRIMITIVES
// ============================================================================

export const Tooltip = ({ children, placement = "top" }: { children: React.ReactNode, placement?: Placement }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const arrowRef = React.useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift(), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
    placement,
  });

  const hover = useHover(context, { delay: { open: 200, close: 100 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TooltipTrigger) {
          return React.cloneElement(child, { ref: refs.setReference, ...getReferenceProps() });
        }
        return child;
      })}
      <FloatingPortal>
        {isOpen && (
          <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
            {React.Children.map(children, (child) => 
              React.isValidElement(child) && child.type === TooltipContent 
                ? React.cloneElement(child, { arrowRef } as any) 
                : null
            )}
          </div>
        )}
      </FloatingPortal>
    </TooltipContext.Provider>
  );
};

export const TooltipTrigger = React.forwardRef<HTMLElement, any>(({ children, ...props }, ref) => 
  React.cloneElement(children, { ref, ...props })
);

export const TooltipContent = ({ children, arrowRef, className }: { children: React.ReactNode, arrowRef?: any, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 5 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 5 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      "z-50 px-3 py-1.5 text-[11px] font-medium text-zinc-100 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-2xl",
      className
    )}
  >
    <FloatingArrow ref={arrowRef} context={{} as any} className="fill-zinc-950/90 stroke-zinc-800" />
    {children}
  </motion.div>
);