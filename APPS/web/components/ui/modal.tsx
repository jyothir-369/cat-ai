"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, CheckCircle2, Info, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & VARIANT ARCHITECTURE (CVA)
// ============================================================================

const overlayVariants = cva(
  "fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none",
  {
    variants: {
      variant: {
        default: "bg-zinc-950/60",
        danger: "bg-rose-950/20 backdrop-blur-sm",
        success: "bg-emerald-950/20 backdrop-blur-sm",
        warning: "bg-amber-950/20 backdrop-blur-sm",
        info: "bg-blue-950/20 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const modalVariants = cva(
  "relative w-full rounded-2xl border bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col font-sans outline-none overflow-hidden my-auto max-h-[90vh]",
  {
    variants: {
      variant: {
        default: "border-zinc-900 shadow-zinc-950/50",
        danger: "border-rose-500/20 shadow-rose-950/10 bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.03),transparent_60%)]",
        success: "border-emerald-500/20 shadow-emerald-950/10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03),transparent_60%)]",
        warning: "border-amber-500/20 shadow-amber-950/10 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.03),transparent_60%)]",
        info: "border-blue-500/20 shadow-blue-950/10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.03),transparent_60%)]",
      },
      size: {
        xs: "max-w-xs",
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        fullscreen: "max-w-full h-full max-h-screen rounded-none border-none m-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export type ModalVariants = VariantProps<typeof modalVariants>;
export type ModalSizes = NonNullable<ModalVariants["size"]>;

export interface ModalTelemetryPayload {
  modalId?: string;
  contextRole: "agent-create" | "workflow-deploy" | "knowledge-upload" | "billing-upgrade" | "admin-destructive";
}

export interface ModalProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">, ModalVariants {
  open?: boolean;
  defaultOpen?: boolean;
  onClose?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  telemetry?: ModalTelemetryPayload;
}

// Global instrumentation pipeline reporting channel
const dispatchModalTelemetry = (payload: ModalTelemetryPayload, action: "open" | "close" | "intercept_escape") => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI MODAL TELEMETRY]: ${action.toUpperCase()} | Context: ${payload.contextRole} | Scope ID: ${payload.modalId ?? "UNCLASSIFIED"}`);
  }
};

// ============================================================================
// STRUCTURAL REACT INNER STATE BOUNDARY MANAGEMENT CONTEXT
// ============================================================================

const ModalContext = React.createContext<{
  variant: ModalVariants["variant"];
  onClose: () => void;
  titleId: string;
  descriptionId: string;
} | undefined>(undefined);

// ============================================================================
// SYSTEM COMPONENT IMPLEMENTATION: MASTER ELEMENT
// ============================================================================

export const Modal: React.FC<ModalProps> = ({
  open: controlledOpen,
  defaultOpen = false,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  variant = "default",
  size = "md",
  title,
  subtitle,
  icon,
  showCloseButton = true,
  telemetry,
  className,
  children,
  ...props
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const overlayRef = React.useRef<HTMLDivElement>(null);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const titleId = React.useId();
  const descriptionId = React.useId();

  const handleClose = React.useCallback(() => {
    if (telemetry) dispatchModalTelemetry(telemetry, "close");
    if (!isControlled) setUncontrolledOpen(false);
    if (onClose) onClose();
  }, [isControlled, onClose, telemetry]);

  // Focus Trapping and Keyboard Layer Matrix Engine Loop
  React.useEffect(() => {
    if (isOpen) {
      if (telemetry) dispatchModalTelemetry(telemetry, "open");
      triggerRef.current = document.activeElement as HTMLElement;
      
      // Enforce strict scroll locking architecture pass across layout frame roots
      document.body.style.overflow = "hidden";
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = "unset";
      triggerRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, telemetry]);

  // Focus Trap Traversal Cyclic Capture Handler Loop
  const handleKeyDownIntercept = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    if (closeOnEscape && e.key === "Escape") {
      e.preventDefault();
      handleClose();
      return;
    }

    if (e.key === "Tab") {
      if (!modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  }, [isOpen, closeOnEscape, handleClose]);

  const handleOverlayClickIntercept = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) return;
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  const contextValue = React.useMemo(() => ({
    variant,
    onClose: handleClose,
    titleId,
    descriptionId,
  }), [variant, handleClose, titleId, descriptionId]);

  // Structural composition filter check mapping
  const hasDirectHeaderProps = !!(title || subtitle || icon);
  const childrenArray = React.Children.toArray(children);
  const hasExplicitHeaderComponent = childrenArray.some(
    (child) => React.isValidElement(child) && child.type === ModalHeader
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalContext.Provider value={contextValue}>
          <div className="fixed inset-0 z-50 isolate">
            <motion.div
              ref={overlayRef}
              onClick={handleOverlayClickIntercept}
              onKeyDown={handleKeyDownIntercept}
              className={cn(overlayVariants({ variant }))}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <motion.div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className={cn(modalVariants({ variant, size, className }))}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                {...props}
              >
                {/* Auto-injected Core Component Mapping Proxy Frame */}
                {hasDirectHeaderProps && !hasExplicitHeaderComponent && (
                  <ModalHeader showCloseButton={showCloseButton}>
                    <div className="flex items-start gap-3">
                      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
                      <div className="space-y-1">
                        <ModalTitle>{title}</ModalTitle>
                        {subtitle && <ModalDescription>{subtitle}</ModalDescription>}
                      </div>
                    </div>
                  </ModalHeader>
                )}

                {/* Main Node Resolution Traversal Layout Router Segment */}
                {childrenArray.some(
                  (child) => React.isValidElement(child) && (child.type === ModalBody || child.type === ModalHeader || child.type === ModalFooter)
                ) ? (
                  children
                ) : (
                  <ModalBody>{children}</ModalBody>
                )}
              </motion.div>
            </motion.div>
          </div>
        </ModalContext.Provider>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// ATOMIC SUBCOMPONENTS PERIMETER DEFINITIONS
// ============================================================================

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
}

export const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, showCloseButton = true, children, ...props }, ref) => {
    const context = React.useContext(ModalContext);
    if (!context) throw new Error("<ModalHeader /> must be initialized within a <Modal /> boundary node.");

    // Auto Variant Visual Theme Alignment Map System Engine
    const defaultVariantIcon = React.useMemo(() => {
      switch (context.variant) {
        case "danger": return <AlertOctagon className="h-5 w-5 text-rose-400" />;
        case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
        case "warning": return <AlertTriangle className="h-5 w-5 text-amber-400" />;
        case "info": return <Info className="h-5 w-5 text-blue-400" />;
        default: return null;
      }
    }, [context.variant]);

    const containsStructuredTitle = React.Children.toArray(children).some(
      (child) => React.isValidElement(child) && (child.type === ModalTitle || child.type === ModalDescription)
    );

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between p-6 pb-4 border-b border-zinc-900/60 select-none shrink-0 gap-4",
          className
        )}
        {...props}
      >
        <div className="flex-1">
          {!containsStructuredTitle && defaultVariantIcon ? (
            <div className="flex items-start gap-3.5">
              <span className="shrink-0 mt-0.5">{defaultVariantIcon}</span>
              <div className="flex-1 space-y-1">{children}</div>
            </div>
          ) : (
            children
          )}
        </div>

        {showCloseButton && (
          <button
            type="button"
            onClick={context.onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-800 -mr-1 -mt-1 shrink-0"
            aria-label="Dismiss platform core modal view frame entity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
ModalHeader.displayName = "ModalHeader";

export const ModalTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(ModalContext);
    return (
      <h2
        ref={ref}
        id={context?.titleId}
        className={cn(
          "text-sm font-mono font-black tracking-tight text-zinc-100 uppercase leading-none",
          className
        )}
        {...props}
      >
        {children}
      </h2>
    );
  }
);
ModalTitle.displayName = "ModalTitle";

export const ModalDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(ModalContext);
    return (
      <p
        ref={ref}
        id={context?.descriptionId}
        className={cn("text-xs text-zinc-500 font-sans leading-relaxed break-words mt-1.5 block", className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
ModalDescription.displayName = "ModalDescription";

export const ModalBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "p-6 flex-1 overflow-y-auto text-xs text-zinc-300 font-sans leading-relaxed custom-scrollbar w-full",
        className
      )}
      {...props}
    />
  )
);
ModalBody.displayName = "ModalBody";

export const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col sm:flex-row items-center justify-end gap-2.5 p-6 pt-4 border-t border-zinc-900/60 bg-zinc-950/20 shrink-0 w-full select-none",
        className
      )}
      {...props}
    />
  )
);
ModalFooter.displayName = "ModalFooter";