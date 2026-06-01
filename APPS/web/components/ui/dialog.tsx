"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertTriangle, CheckCircle2, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SYSTEM DESIGN TOKENS & VARIANT ARCHITECTURE (CVA)
// ============================================================================

const overlayVariants = cva(
  "fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none",
  {
    variants: {
      variant: {
        default: "bg-zinc-950/40",
        success: "bg-emerald-950/10 backdrop-blur-xs",
        warning: "bg-amber-950/10 backdrop-blur-xs",
        danger: "bg-rose-950/10 backdrop-blur-xs",
        info: "bg-blue-950/10 backdrop-blur-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const contentVariants = cva(
  "relative w-full rounded-2xl border bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col font-sans outline-none overflow-hidden my-auto max-h-[92vh]",
  {
    variants: {
      variant: {
        default: "border-zinc-900 shadow-zinc-950/60",
        success: "border-emerald-500/20 shadow-emerald-950/10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.02),transparent_60%)]",
        warning: "border-amber-500/20 shadow-amber-950/10 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.02),transparent_60%)]",
        danger: "border-rose-500/20 shadow-rose-950/10 bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.02),transparent_60%)]",
        info: "border-blue-500/20 shadow-blue-950/10 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.02),transparent_60%)]",
      },
      size: {
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

export type DialogVariants = VariantProps<typeof contentVariants>;
export type DialogSizes = NonNullable<DialogVariants["size"]>;

export interface DialogTelemetryPayload {
  dialogId?: string;
  trackingRole: "agent-creation" | "workflow-editing" | "knowledge-base" | "billing-ops" | "rbac-management" | "org-settings";
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: DialogVariants["variant"];
  size?: DialogSizes;
  loading?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  telemetry?: DialogTelemetryPayload;
  children?: React.ReactNode;
}

const dispatchDialogTelemetry = (payload: DialogTelemetryPayload, event: "mount" | "unmount" | "interaction_abort") => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI DIALOG METRICS]: ${event.toUpperCase()} | Role Core Context: ${payload.trackingRole} | Dialog Scope ID: ${payload.dialogId ?? "UNCLASSIFIED"}`);
  }
};

// ============================================================================
// CONTEXT PRIMITIVE ARCHITECTURE
// ============================================================================

interface DialogContextProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  variant: DialogVariants["variant"];
  size: DialogSizes;
  loading: boolean;
  closeOnOutsideClick: boolean;
  closeOnEscape: boolean;
  titleId: string;
  descriptionId: string;
  telemetry?: DialogTelemetryPayload;
}

const DialogContext = React.createContext<DialogContextProps | undefined>(undefined);

const useDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("CAT AI Dialog subcomponents must be explicitly wrapped inside a <Dialog /> layout engine node.");
  return context;
};

// ============================================================================
// COMPONENT IMPLEMENTATION: MASTER DISPATCHER ROOT
// ============================================================================

export const Dialog: React.FC<DialogProps> = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  variant = "default",
  size = "md",
  loading = false,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  telemetry,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setIsOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      if (onOpenChange) onOpenChange(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (isOpen && telemetry) {
      dispatchDialogTelemetry(telemetry, "mount");
    }
  }, [isOpen, telemetry]);

  const contextValue = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      variant,
      size,
      loading,
      closeOnOutsideClick,
      closeOnEscape,
      titleId,
      descriptionId,
      telemetry,
    }),
    [isOpen, setIsOpen, variant, size, loading, closeOnOutsideClick, closeOnEscape, titleId, descriptionId, telemetry]
  );

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;
};

// ============================================================================
// PRIMITIVE EMITTER: TRIGGER HOOK NODE
// ============================================================================

export interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export const DialogTrigger = React.forwardRef<HTMLElement, DialogTriggerProps>(
  ({ asChild, children }, ref) => {
    const { setIsOpen } = useDialog();

    const handleTriggerIntercept = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsOpen(true);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        onClick: (e: React.MouseEvent) => {
          handleTriggerIntercept(e);
          if ((children.props as { onClick?: (e: React.MouseEvent) => void }).onClick) {
            (children.props as { onClick: (e: React.MouseEvent) => void }).onClick(e);
          }
        },
      } as React.Attributes & typeof children.props);
    }

    return (
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={handleTriggerIntercept}
        className="outline-none focus-visible:ring-2 focus-visible:ring-zinc-800"
      >
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = "DialogTrigger";

// ============================================================================
// ATOMIC SHELL STRUCTURE CONTAINER: CONTENT VIEW PORT
// ============================================================================

export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen, variant, size, loading, closeOnOutsideClick, closeOnEscape, titleId, descriptionId, telemetry } = useDialog();

    const overlayRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const originActiveElementRef = React.useRef<HTMLElement | null>(null);

    const handleDismissAction = React.useCallback(() => {
      if (loading) return;
      if (telemetry) dispatchDialogTelemetry(telemetry, "interaction_abort");
      setIsOpen(false);
    }, [loading, setIsOpen, telemetry]);

    // Focus Trap & Cyclic Accessibility Sync Phase Pass Loop
    React.useEffect(() => {
      if (isOpen) {
        originActiveElementRef.current = document.activeElement as HTMLElement;
        document.body.style.overflow = "hidden";
        contentRef.current?.focus();
      } else {
        document.body.style.overflow = "unset";
        originActiveElementRef.current?.focus();
      }
      return () => {
        document.body.style.overflow = "unset";
      };
    }, [isOpen]);

    const handleKeyDownIntercept = React.useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isOpen) return;

        if (closeOnEscape && e.key === "Escape") {
          e.preventDefault();
          handleDismissAction();
          return;
        }

        if (e.key === "Tab") {
          if (!contentRef.current) return;
          const targetElements = contentRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (targetElements.length === 0) return;

          const firstNode = targetElements[0] as HTMLElement;
          const lastNode = targetElements[targetElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstNode) {
              lastNode.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastNode) {
              firstNode.focus();
              e.preventDefault();
            }
          }
        }
      },
      [isOpen, closeOnEscape, handleDismissAction]
    );

    const handleOverlayClickIntercept = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!closeOnOutsideClick) return;
      if (e.target === overlayRef.current) {
        handleDismissAction();
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
          <div className="fixed inset-0 z-50 isolate">
            <motion.div
              ref={overlayRef}
              onClick={handleOverlayClickIntercept}
              onKeyDown={handleKeyDownIntercept}
              className={cn(overlayVariants({ variant }))}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <motion.div
                ref={combinedRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className={cn(contentVariants({ variant, size, className }))}
                initial={{ opacity: 0, scale: 0.97, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                {...props}
              >
                {/* Structural Asynchronous Interlock Loader Processing Shutter Layer Block */}
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs z-50 flex flex-col items-center justify-center gap-2.5 font-mono text-[10px] tracking-widest text-zinc-400 uppercase select-none"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-200" />
                      <span>Synchronizing Framework Pipelines</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {children}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);
DialogContent.displayName = "DialogContent";

// ============================================================================
// SYSTEM HOOK SUBCOMPONENTS PERIMETERS
// ============================================================================

export const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { variant } = useDialog();

    const automatedSystemIcon = React.useMemo(() => {
      switch (variant) {
        case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
        case "warning": return <AlertTriangle className="h-5 w-5 text-amber-400" />;
        case "danger": return <AlertOctagon className="h-5 w-5 text-rose-400" />;
        case "info": return <Info className="h-5 w-5 text-blue-400" />;
        default: return null;
      }
    }, [variant]);

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between p-6 pb-4 border-b border-zinc-900/60 shrink-0 gap-4 select-none",
          className
        )}
        {...props}
      >
        <div className="flex-1 flex items-start gap-3.5">
          {automatedSystemIcon && <span className="shrink-0 mt-0.5">{automatedSystemIcon}</span>}
          <div className="flex-1 space-y-1">{children}</div>
        </div>

        <DialogClose className="-mr-1 -mt-1" />
      </div>
    );
  }
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { titleId } = useDialog();
    return (
      <h2
        ref={ref}
        id={titleId}
        className={cn("text-sm font-mono font-black tracking-tight text-zinc-100 uppercase leading-none", className)}
        {...props}
      />
    );
  }
);
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { descriptionId } = useDialog();
    return (
      <p
        ref={ref}
        id={descriptionId}
        className={cn("text-xs text-zinc-500 font-sans leading-relaxed break-words mt-1 block", className)}
        {...props}
      />
    );
  }
);
DialogDescription.displayName = "DialogDescription";

export const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
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
DialogBody.displayName = "DialogBody";

export const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
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
DialogFooter.displayName = "DialogFooter";

// ============================================================================
// PRIMITIVE COMPONENT: INLINE ACTION DISMISS CLOSE BUTTON
// ============================================================================

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ asChild, className, children, ...props }, ref) => {
    const { setIsOpen, loading } = useDialog();

    const handleCloseActionIntercept = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) return;
      setIsOpen(false);
      if (props.onClick) props.onClick(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        onClick: handleCloseActionIntercept,
        disabled: loading || (children.props as { disabled?: boolean }).disabled,
      } as React.Attributes & typeof children.props);
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={loading}
        onClick={handleCloseActionIntercept}
        className={cn(
          "rounded-lg p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-800 disabled:opacity-30 disabled:pointer-events-none",
          !children && "h-7 w-7 flex items-center justify-center",
          className
        )}
        aria-label="Dismiss platform core dialog viewport entity"
        {...props}
      >
        {children || <X className="h-4 w-4 shrink-0" />}
      </button>
    );
  }
);
DialogClose.displayName = "DialogClose";