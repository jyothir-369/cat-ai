"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, X, Search, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & VARIANT ARCHITECTURE (CVA)
// ============================================================================

const inputVariants = cva(
  "block w-full rounded-xl font-sans text-xs transition-all duration-200 outline-none focus:outline-none disabled:pointer-events-none disabled:opacity-40 placeholder:text-zinc-500",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-950 text-zinc-100 border border-zinc-900 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 shadow-xs",
        filled:
          "bg-zinc-900 text-zinc-100 border border-transparent focus:bg-zinc-950 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700",
        outline:
          "bg-transparent text-zinc-100 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500",
        ghost:
          "bg-transparent text-zinc-100 border border-transparent focus:bg-zinc-900/40 focus:border-zinc-800",
        glass:
          "bg-zinc-950/40 text-zinc-100 border border-zinc-900/60 backdrop-blur-xl focus:border-zinc-700/80 focus:ring-1 focus:ring-zinc-700/80 shadow-md",
        enterprise:
          "bg-[#050507] text-zinc-200 border border-zinc-900 focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/30 shadow-[0_0_15px_rgba(255,255,255,0.01)]",
      },
      size: {
        xs: "h-7 px-2.5 text-[10px] rounded-lg placeholder:text-[10px]",
        sm: "h-9 px-3.5 rounded-lg text-[11px] placeholder:text-[11px]",
        md: "h-11 px-4 text-xs",
        lg: "h-12 px-5 text-xs sm:text-sm",
        xl: "h-14 px-6 text-sm tracking-wide",
      },
      state: {
        normal: "",
        error: "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30 bg-rose-950/5 text-rose-200",
        success: "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/30 bg-emerald-950/5 text-emerald-200",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "normal"
    }
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;
export type InputSizes = NonNullable<InputVariants["size"]>;

export interface InputTelemetryPayload {
  inputId?: string;
  formId?: string;
  trackingRole: "auth" | "agent-config" | "workflow-builder" | "knowledge-base" | "billing" | "admin";
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "state">,
    Omit<VariantProps<typeof inputVariants>, "state"> {
  error?: string;
  success?: boolean;
  loading?: boolean;
  label?: string;
  description?: string;
  prefixText?: string;
  suffixText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  maxLengthCounter?: boolean;
  telemetry?: InputTelemetryPayload;
  secureCopyPrevention?: boolean;
}

const dispatchInputTelemetry = (payload: InputTelemetryPayload, eventAction: "focus" | "blur" | "error_triggered" | "complete") => {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI INPUT METRICS]: ${eventAction.toUpperCase()} | Role: ${payload.trackingRole} | Input ID: ${payload.inputId ?? "UNCLASSIFIED"}`);
  }
};

// ============================================================================
// CONTEXT INPUT GROUP DIRECTORY
// ============================================================================

const InputGroupContext = React.createContext<{ size?: InputSizes; variant?: InputVariants["variant"] }>({});

export const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { size?: InputSizes; variant?: InputVariants["variant"] }>(
  ({ className, size, variant, children, ...props }, ref) => {
    return (
      <InputGroupContext.Provider value={{ size, variant }}>
        <div ref={ref} className={cn("relative flex items-stretch w-full rounded-xl isolate", className)} {...props}>
          {children}
        </div>
      </InputGroupContext.Provider>
    );
  }
);
InputGroup.displayName = "InputGroup";

// ============================================================================
// CORE ACCESSIBLE FRAMEWORK SUBCOMPONENTS
// ============================================================================

export const InputLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, children, ...props }, ref) => (
    <label ref={ref} className={cn("block text-[11px] font-mono font-black tracking-wider text-zinc-400 uppercase select-none mb-1.5", className)} {...props}>
      {children}
    </label>
  )
);
InputLabel.displayName = "InputLabel";

export const InputDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[11px] font-sans leading-relaxed text-zinc-500 mt-1", className)} {...props} />
  )
);
InputDescription.displayName = "InputDescription";

export const InputError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
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
InputError.displayName = "InputError";

// ============================================================================
// COMPONENT IMPLEMENTATION: MAIN INPUT
// ============================================================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      error,
      success,
      loading,
      label,
      description,
      prefixText,
      suffixText,
      leadingIcon,
      trailingIcon,
      maxLengthCounter,
      telemetry,
      secureCopyPrevention = false,
      type = "text",
      onChange,
      onFocus,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const groupContext = React.useContext(InputGroupContext);
    const activeSize = size || groupContext.size || "md";
    const activeVariant = variant || groupContext.variant || "default";

    const [charCount, setCharCount] = React.useState(0);
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const descriptionId = `${inputId}-desc`;
    const errorId = `${inputId}-error`;

    const inputState = error ? "error" : success ? "success" : "normal";

    const handleCopyCutIntercept = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (secureCopyPrevention) {
        e.preventDefault();
        if (telemetry) dispatchInputTelemetry(telemetry, "error_triggered");
      }
    };

    const handleOnChangeWrapper = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      if (onChange) onChange(e);
    };

    const handleOnFocusWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      if (telemetry) dispatchInputTelemetry(telemetry, "focus");
      if (onFocus) onFocus(e);
    };

    const handleOnBlurWrapper = (e: React.FocusEvent<HTMLInputElement>) => {
      if (telemetry) {
        dispatchInputTelemetry(telemetry, "blur");
        if (e.target.value.length > 0) dispatchInputTelemetry(telemetry, "complete");
      }
      if (onBlur) onBlur(e);
    };

    const inputElement = (
      <input
        ref={ref}
        type={type}
        id={inputId}
        aria-describedby={error ? errorId : description ? descriptionId : undefined}
        aria-invalid={!!error}
        onCopy={handleCopyCutIntercept}
        onCut={handleCopyCutIntercept}
        onChange={handleOnChangeWrapper}
        onFocus={handleOnFocusWrapper}
        onBlur={handleOnBlurWrapper}
        className={cn(
          inputVariants({ variant: activeVariant, size: activeSize, state: inputState, className }),
          leadingIcon && "pl-10",
          trailingIcon && "pr-10",
          prefixText && "rounded-l-none border-l-transparent",
          suffixText && "rounded-r-none border-r-transparent"
        )}
        {...props}
      />
    );

    const wrappedLayout = (
      <div className="relative flex-1 w-full items-center">
        {leadingIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 z-10 pointer-events-none transition-colors">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /> : leadingIcon}
          </div>
        )}

        {inputElement}

        {trailingIcon && !loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 z-10 pointer-events-none">
            {trailingIcon}
          </div>
        )}

        {loading && !leadingIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 z-10 pointer-events-none">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
          </div>
        )}
      </div>
    );

    // If standalone form config pattern is requested, unpack components cleanly
    if (label || description || error || maxLengthCounter) {
      return (
        <motion.div 
          className="w-full flex flex-col"
          animate={error ? { x: [0, -4, 4, -4, 4, 0] } : {}}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {label && (
            <div className="flex items-center justify-between gap-2">
              <InputLabel htmlFor={inputId}>{label}</InputLabel>
              {maxLengthCounter && props.maxLength && (
                <span className="text-[10px] font-mono text-zinc-600 select-none mb-1.5">
                  {charCount}/{props.maxLength}
                </span>
              )}
            </div>
          )}

          <div className="relative flex items-stretch w-full rounded-xl isolate">
            {prefixText && (
              <span className="inline-flex items-center justify-center px-3.5 rounded-l-xl bg-zinc-900 border border-zinc-800 border-r-transparent text-zinc-400 font-mono text-[11px] select-none">
                {prefixText}
              </span>
            )}
            
            {wrappedLayout}

            {suffixText && (
              <span className="inline-flex items-center justify-center px-3.5 rounded-r-xl bg-zinc-900 border border-zinc-800 border-l-transparent text-zinc-400 font-mono text-[11px] select-none">
                {suffixText}
              </span>
            )}
          </div>

          {description && !error && <InputDescription id={descriptionId}>{description}</InputDescription>}
          <AnimatePresence>{error && <InputError id={errorId}>{error}</InputError>}</AnimatePresence>
        </motion.div>
      );
    }

    return wrappedLayout;
  }
);
Input.displayName = "Input";

// ============================================================================
// SYSTEM SPECIALIZED VARIANTS: PASSWORD CONFIGURATION INPUT
// ============================================================================

export interface PasswordInputProps extends Omit<InputProps, "type" | "leadingIcon" | "trailingIcon"> {
  showStrengthMeter?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrengthMeter = false, onChange, ...props }, ref) => {
    const [reveal, setReveal] = React.useState(false);
    const [strengthScore, setStrengthScore] = React.useState(0);

    const calculateStrengthMetric = (val: string): number => {
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;
      return score;
    };

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (showStrengthMeter) {
        setStrengthScore(calculateStrengthMetric(e.target.value));
      }
      if (onChange) onChange(e);
    };

    return (
      <div className="w-full space-y-1.5">
        <Input
          ref={ref}
          type={reveal ? "text" : "password"}
          onChange={handleOnChange}
          secureCopyPrevention={true}
          autoComplete="current-password"
          trailingIcon={
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="text-zinc-500 hover:text-zinc-300 pointer-events-auto transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          }
          {...props}
        />

        {showStrengthMeter && (
          <div className="flex items-center gap-1 w-full pt-1 select-none">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-sm transition-all duration-300",
                  index < strengthScore
                    ? strengthScore <= 2
                      ? "bg-rose-500"
                      : strengthScore === 3
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                    : "bg-zinc-800"
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

// ============================================================================
// SYSTEM SPECIALIZED VARIANTS: SEARCH CONTROLLER INPUT
// ============================================================================

export interface SearchInputProps extends Omit<InputProps, "leadingIcon" | "trailingIcon"> {
  onClear?: () => void;
  value: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        leadingIcon={<Search className="h-3.5 w-3.5" />}
        trailingIcon={
          value.length > 0 && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-zinc-500 hover:text-zinc-300 pointer-events-auto transition-colors focus:outline-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";

// ============================================================================
// SYSTEM SPECIALIZED VARIANTS: TEXTAREA CONTEXT NODE
// ============================================================================

export interface TextareaInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    Omit<VariantProps<typeof inputVariants>, "state"> {
  error?: string;
  label?: string;
  description?: string;
}

export const TextareaInput = React.forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  ({ className, variant, size, error, label, description, id, ...props }, ref) => {
    const activeSize = size || "md";
    const activeVariant = variant || "default";
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col">
        {label && <InputLabel htmlFor={inputId}>{label}</InputLabel>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            inputVariants({ variant: activeVariant, size: activeSize, state: error ? "error" : "normal" }),
            "h-auto min-h-[80px] py-3 resize-y font-sans",
            className
          )}
          {...props}
        />
        {description && !error && <InputDescription>{description}</InputDescription>}
        <AnimatePresence>{error && <InputError>{error}</InputError>}</AnimatePresence>
      </div>
    );
  }
);
TextareaInput.displayName = "TextareaInput";