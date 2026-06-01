"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, CheckCircle2, Coins, CornerDownLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & DESIGN CONTRACTS (CVA)
// ============================================================================

const textareaVariants = cva(
  "block w-full rounded-xl text-xs transition-all duration-200 outline-none focus:outline-none disabled:pointer-events-none disabled:opacity-40 placeholder:text-zinc-500 font-sans leading-relaxed resize-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-950 text-zinc-100 border border-zinc-900 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 shadow-xs",
        outline:
          "bg-transparent text-zinc-100 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500",
        filled:
          "bg-zinc-900 text-zinc-100 border border-transparent focus:bg-zinc-950 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700",
        ghost:
          "bg-transparent text-zinc-100 border border-transparent focus:bg-zinc-900/40 focus:border-zinc-800",
        glass:
          "bg-zinc-950/40 text-zinc-100 border border-zinc-900/60 backdrop-blur-xl focus:border-zinc-700/80 focus:ring-1 focus:ring-zinc-700/80 shadow-md",
        enterprise:
          "bg-[#050507] text-zinc-200 border border-zinc-900 focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 shadow-[0_0_15px_rgba(255,255,255,0.01)]",
        "ai-console":
          "bg-zinc-950 text-zinc-50 font-mono text-[11px] border border-purple-500/20 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.02)]",
        editor:
          "bg-zinc-950/20 text-zinc-100 border-none focus:ring-0 p-0 rounded-none leading-7 text-sm",
      },
      size: {
        xs: "min-h-[40px] p-2 text-[11px]",
        sm: "min-h-[64px] p-3 text-[11px]",
        md: "min-h-[100px] p-4 text-xs",
        lg: "min-h-[160px] p-5 text-xs sm:text-sm",
        xl: "min-h-[240px] p-6 text-sm tracking-wide",
        full: "h-full min-h-[400px] p-6 text-sm",
      },
      state: {
        normal: "",
        error: "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30 bg-rose-950/5 text-rose-200",
        success: "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/30 bg-emerald-950/5 text-emerald-200",
        warning: "border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/30 bg-amber-950/5 text-amber-200",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "normal"
    }
  }
);

export type TextareaVariants = VariantProps<typeof textareaVariants>;
export type TextareaSizes = NonNullable<TextareaVariants["size"]>;

export interface TextareaTelemetryPayload {
  componentId?: string;
  trackingContext: "prompt-editor" | "workflow-desc" | "knowledge-base" | "admin-panel" | "chat-mode";
}

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size" | "state">,
    Omit<VariantProps<typeof textareaVariants>, "state"> {
  error?: string;
  success?: boolean;
  warning?: string;
  loading?: boolean;
  label?: string;
  description?: string;
  autoResize?: boolean;
  showCounters?: boolean;
  showAiMetrics?: boolean;
  costPer1kTokens?: number; // Custom estimation architecture tracking metric rules
  onEnterSubmit?: (value: string) => void; // Enterprise Chat Hook integration system handler
  telemetry?: TextareaTelemetryPayload;
}

const dispatchTextareaTelemetry = (payload: TextareaTelemetryPayload, actionType: "focus" | "blur" | "autosize_trigger" | "submit") => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI TEXTAREA METRICS]: ${actionType.toUpperCase()} | Context: ${payload.trackingContext} | ID: ${payload.componentId ?? "UNCLASSIFIED"}`);
  }
};

// ============================================================================
// SYSTEM CONTEXT INTERFACE MATRIX DIRECTORY
// ============================================================================

const TextareaContext = React.createContext<{
  value: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  variant: TextareaVariants["variant"];
  size: TextareaSizes;
} | undefined>(undefined);

// ============================================================================
// CORE STRUCTURAL LAYOUT COMPONENT SYSTEM
// ============================================================================

export const TextareaLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, children, ...props }, ref) => (
    <label ref={ref} className={cn("block text-[11px] font-mono font-black tracking-wider text-zinc-400 uppercase select-none mb-1.5", className)} {...props}>
      {children}
    </label>
  )
);
TextareaLabel.displayName = "TextareaLabel";

export const TextareaDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[11px] font-sans leading-relaxed text-zinc-500 mt-1", className)} {...props} />
  )
);
TextareaDescription.displayName = "TextareaDescription";

export const TextareaError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 mt-1.5"
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <p ref={ref} className={cn(className)} {...props}>
        {children}
      </p>
    </motion.div>
  )
);
TextareaError.displayName = "TextareaError";

// ============================================================================
// SUBCOMPONENTS: TOOLBARS, FOOTERS & COUNTERS MODULES
// ============================================================================

export const TextareaHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex items-center justify-between border-b border-zinc-900 px-4 py-2 bg-zinc-950/60 backdrop-blur-xs rounded-t-xl gap-2", className)}>
    {children}
  </div>
);

export const TextareaToolbar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40 shadow-inner w-fit select-none", className)}>
    {children}
  </div>
);

export const TextareaFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex items-center justify-between border-t border-zinc-900/60 pt-2 mt-1 w-full gap-4 select-none", className)}>
    {children}
  </div>
);

export const TextareaActions = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex items-center gap-2", className)}>
    {children}
  </div>
);

export const TextareaCounter = () => {
  const context = React.useContext(TextareaContext);
  if (!context) return null;

  return (
    <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
      <span>LN {context.lineCount}</span>
      <span>WD {context.wordCount}</span>
      <span>CH {context.charCount}</span>
    </div>
  );
};

// ============================================================================
// PRODUCTION-READY COMPONENT ARCHITECTURE IMPLEMENTATION
// ============================================================================

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      error,
      success,
      warning,
      loading,
      label,
      description,
      autoResize = true,
      showCounters = false,
      showAiMetrics = false,
      costPer1kTokens = 0.0015,
      onEnterSubmit,
      telemetry,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      value: customValue,
      defaultValue,
      id,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const [uncontrolledValue, setUncontrolledValue] = React.useState("");
    const isControlled = customValue !== undefined;
    const activeValue = isControlled ? String(customValue) : uncontrolledValue;

    const generatedId = React.useId();
    const textareaId = id || generatedId;

    // Advanced Text Metrics Matrix Pipeline Parsing Engine
    const charCount = activeValue.length;
    const wordCount = activeValue.trim() === "" ? 0 : activeValue.trim().split(/\s+/).length;
    const lineCount = activeValue === "" ? 1 : activeValue.split("\n").length;
    
    // Abstract Token Counter Vector Approximation logic (Standard ~4 chars per token)
    const estimatedTokens = Math.ceil(charCount / 4);
    const estimatedCost = (estimatedTokens / 1000) * costPer1kTokens;

    const activeState = error ? "error" : success ? "success" : warning ? "warning" : "normal";

    // High Efficiency Auto Resizing Frame Realization Engine Module
    const enforceAutosizeSync = React.useCallback(() => {
      if (!autoResize || !internalRef.current) return;
      const element = internalRef.current;
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }, [autoResize]);

    React.useEffect(() => {
      if (activeValue !== "") {
        enforceAutosizeSync();
        if (telemetry) dispatchTextareaTelemetry(telemetry, "autosize_trigger");
      }
    }, [activeValue, enforceAutosizeSync, telemetry]);

    const handleOnChangeWrapper = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) setUncontrolledValue(e.target.value);
      if (onChange) onChange(e);
      setTimeout(enforceAutosizeSync, 0);
    };

    const handleOnFocusWrapper = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (telemetry) dispatchTextareaTelemetry(telemetry, "focus");
      if (onFocus) onFocus(e);
    };

    const handleOnBlurWrapper = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (telemetry) dispatchTextareaTelemetry(telemetry, "blur");
      if (onBlur) onBlur(e);
    };

    const handleKeyDownWrapper = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Chat mode integration structure handler intercepts Enter (no shift payload match)
      if (onEnterSubmit && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (activeValue.trim().length > 0) {
          if (telemetry) dispatchTextareaTelemetry(telemetry, "submit");
          onEnterSubmit(activeValue);
          if (!isControlled) setUncontrolledValue("");
        }
      }
      if (onKeyDown) onKeyDown(e);
    };

    const textareaContextValue = React.useMemo(() => ({
      value: activeValue,
      charCount,
      wordCount,
      lineCount,
      variant,
      size,
    }), [activeValue, charCount, wordCount, lineCount, variant, size]);

    return (
      <TextareaContext.Provider value={textareaContextValue}>
        <motion.div
          className="w-full flex flex-col"
          animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {label && <TextareaLabel htmlFor={textareaId}>{label}</TextareaLabel>}

          <div className="relative w-full rounded-xl isolate flex flex-col">
            <textarea
              ref={combinedRef}
              id={textareaId}
              value={customValue}
              defaultValue={defaultValue}
              onChange={handleOnChangeWrapper}
              onFocus={handleOnFocusWrapper}
              onBlur={handleOnBlurWrapper}
              onKeyDown={handleKeyDownWrapper}
              className={cn(
                textareaVariants({ variant, size, state: activeState, className })
              )}
              {...props}
            />

            {/* Ingress Loading Processing Overlay Vector Grid Block */}
            {loading && (
              <div className="absolute right-3 top-3 z-20 pointer-events-none">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
              </div>
            )}
          </div>

          {/* Context Footer Resolution Interface Matrix Configuration */}
          {(showCounters || showAiMetrics || onEnterSubmit || description || error || warning) && (
            <TextareaFooter>
              <div className="flex-1">
                {description && !error && !warning && <TextareaDescription>{description}</TextareaDescription>}
                <AnimatePresence>
                  {error && <TextareaError>{error}</TextareaError>}
                  {warning && !error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1 text-[11px] font-mono text-amber-400 mt-1"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{warning}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Token Estimation metrics subsystem architecture overlay render pass */}
                {showAiMetrics && variant === "ai-console" && (
                  <div className="flex items-center gap-3 pt-1.5 font-mono text-[10px] text-purple-400 select-none">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      EST TOKENS: {estimatedTokens}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Coins className="h-3 w-3 text-zinc-600" />
                      EST COST: ${estimatedCost.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {showCounters && <TextareaCounter />}
                {onEnterSubmit && (
                  <span className="text-[9px] font-mono text-zinc-600 flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    <span>Enter to send</span>
                    <CornerDownLeft className="h-2 w-2" />
                  </span>
                )}
              </div>
            </TextareaFooter>
          )}
        </motion.div>
      </TextareaContext.Provider>
    );
  }
);
Textarea.displayName = "Textarea";