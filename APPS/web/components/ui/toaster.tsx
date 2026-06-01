"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { Toaster as SonnerToaster, toast as nativeSonnerToast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  ShieldAlert, 
  Cpu, 
  GitBranch, 
  Database, 
  CreditCard, 
  Loader2, 
  RefreshCw, 
  Clock,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & ENTERPRISE CONTRACTS
// ============================================================================

export type ToastCategory = 
  | "SUCCESS" 
  | "ERROR" 
  | "WARNING" 
  | "INFO" 
  | "SECURITY" 
  | "WORKFLOW" 
  | "AGENT" 
  | "KNOWLEDGE" 
  | "BILLING";

export interface ToastAction {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  primary?: boolean;
}

export interface ToastPayload {
  title: string;
  description?: string;
  category?: ToastCategory;
  timestamp?: number;
  action?: ToastAction;
  secondaryAction?: ToastAction;
  metadata?: Record<string, unknown>;
  deduplicateId?: string;
  showProgress?: boolean;
}

export interface TelemetryLog {
  eventId: string;
  action: "created" | "dismissed" | "clicked" | "action_triggered" | "expired";
  category: ToastCategory;
  title: string;
  timestamp: number;
}

// Global Registry holding local cache vectors for observability & deduplication mechanisms
const activeDeduplicationKeys = new Set<string>();
let telemetryStorageQueue: TelemetryLog[] = [];

const pipelineTelemetry = (log: TelemetryLog) => {
  telemetryStorageQueue.push(log);
  if (telemetryStorageQueue.length > 250) {
    telemetryStorageQueue.shift(); // Eviction strategy bounds
  }
  if (process.env.NODE_ENV === "development") {
    console.debug(`[CAT AI TOAST MONITOR]: ${log.action.toUpperCase()} - [${log.category}] ${log.title}`);
  }
};

// ============================================================================
// CUSTOM ENTERPRISE INTERACTIVE CARDS & RENDER AGENTS
// ============================================================================

interface CustomToastLayoutProps {
  id: string | number;
  payload: ToastPayload;
  onDismiss: () => void;
}

const CustomToastLayout: React.FC<CustomToastLayoutProps> = ({ id, payload, onDismiss }) => {
  const {
    title,
    description,
    category = "INFO",
    timestamp = Date.now(),
    action,
    secondaryAction,
    showProgress = false
  } = payload;

  // Strategic Icon Picker Node Core Map
  const IconComponent = useMemo(() => {
    switch (category) {
      case "SUCCESS": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "ERROR": return <XCircle className="h-4 w-4 text-rose-400" />;
      case "WARNING": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "SECURITY": return <ShieldAlert className="h-4 w-4 text-indigo-400" />;
      case "WORKFLOW": return <GitBranch className="h-4 w-4 text-cyan-400" />;
      case "AGENT": return <Cpu className="h-4 w-4 text-fuchsia-400" />;
      case "KNOWLEDGE": return <Database className="h-4 w-4 text-teal-400" />;
      case "BILLING": return <CreditCard className="h-4 w-4 text-orange-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  }, [category]);

  const formattedTime = useMemo(() => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [timestamp]);

  const handleActionWrapper = (e: React.MouseEvent<HTMLButtonElement>, act?: ToastAction, isPrimary = true) => {
    e.stopPropagation();
    if (!act) return;
    pipelineTelemetry({
      eventId: String(id),
      action: "action_triggered",
      category,
      title: `${title} -> Action: ${act.label} (${isPrimary ? 'Primary' : 'Secondary'})`,
      timestamp: Date.now()
    });
    act.onClick(e);
    onDismiss();
  };

  return (
    <div 
      className="w-full relative flex flex-col rounded-xl border border-zinc-900 bg-zinc-950/80 p-4 text-zinc-100 shadow-2xl backdrop-blur-xl transition-all select-none overflow-hidden group/card"
      onClick={() => pipelineTelemetry({ eventId: String(id), action: "clicked", category, title, timestamp: Date.now() })}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Visual Identity Left Color Line Anchor */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${
        category === "SUCCESS" ? "bg-emerald-500" :
        category === "ERROR" ? "bg-rose-500" :
        category === "WARNING" ? "bg-amber-500" :
        category === "SECURITY" ? "bg-indigo-500" :
        category === "WORKFLOW" ? "bg-cyan-500" :
        category === "AGENT" ? "bg-fuchsia-500" :
        category === "KNOWLEDGE" ? "bg-teal-500" :
        category === "BILLING" ? "bg-orange-500" : "bg-blue-500"
      }`} />

      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60 shadow-inner">
          {IconComponent}
        </div>

        <div className="flex-1 space-y-1 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-mono font-black tracking-tight text-zinc-200 truncate uppercase">
              {title}
            </h4>
            <span className="text-[9px] font-mono font-medium text-zinc-600 flex items-center gap-1 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {formattedTime}
            </span>
          </div>

          {description && (
            <p className="text-[11px] leading-relaxed text-zinc-400 font-sans break-words pr-2">
              {description}
            </p>
          )}

          {/* Action Trigger Node Sections Matrix */}
          {(action || secondaryAction) && (
            <div className="flex items-center gap-2 pt-2.5 font-mono text-[10px]">
              {secondaryAction && (
                <button
                  type="button"
                  onClick={(e) => handleActionWrapper(e, secondaryAction, false)}
                  className="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
                >
                  {secondaryAction.label}
                </button>
              )}
              {action && (
                <button
                  type="button"
                  onClick={(e) => handleActionWrapper(e, action, true)}
                  className="px-2.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold transition-all flex items-center gap-1 shadow-sm active:scale-98"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="h-3 w-3 text-zinc-950" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Real-time Progress Simulation Strip Line */}
      {showProgress && (
        <div className="absolute bottom-0 left-1 right-0 h-0.5 bg-zinc-900">
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 4.95, ease: "linear" }}
            className={`h-full ${
              category === "SUCCESS" ? "bg-emerald-500/60" :
              category === "ERROR" ? "bg-rose-500/60" :
              category === "WARNING" ? "bg-amber-500/60" : "bg-blue-500/60"
            }`}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HIGH-LEVEL GLOBAL UTILITY FOR ABSTRACTED INVOCATIONS
// ============================================================================

export const toast = {
  // Generic Context Engine
  custom: (payload: ToastPayload) => {
    if (payload.deduplicateId) {
      if (activeDeduplicationKeys.has(payload.deduplicateId)) return null;
      activeDeduplicationKeys.add(payload.deduplicateId);
    }

    const assignedId = nativeSonnerToast.custom((id) => (
      <CustomToastLayout 
        id={id} 
        payload={payload} 
        onDismiss={() => {
          nativeSonnerToast.dismiss(id);
          if (payload.deduplicateId) activeDeduplicationKeys.delete(payload.deduplicateId);
        }} 
      />
    ), {
      duration: 5000,
      onAutoClose: () => {
        if (payload.deduplicateId) activeDeduplicationKeys.delete(payload.deduplicateId);
        pipelineTelemetry({ eventId: "auto-close", action: "expired", category: payload.category || "INFO", title: payload.title, timestamp: Date.now() });
      },
      onDismiss: () => {
        if (payload.deduplicateId) activeDeduplicationKeys.delete(payload.deduplicateId);
        pipelineTelemetry({ eventId: "manual-dismiss", action: "dismissed", category: payload.category || "INFO", title: payload.title, timestamp: Date.now() });
      }
    });

    pipelineTelemetry({
      eventId: String(assignedId),
      action: "created",
      category: payload.category || "INFO",
      title: payload.title,
      timestamp: Date.now()
    });

    return assignedId;
  },

  success: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "SUCCESS", showProgress: true, ...config });
  },

  error: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "ERROR", showProgress: true, ...config });
  },

  warning: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "WARNING", showProgress: true, ...config });
  },

  info: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "INFO", showProgress: true, ...config });
  },

  security: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "SECURITY", ...config });
  },

  workflow: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "WORKFLOW", ...config });
  },

  agent: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "AGENT", ...config });
  },

  knowledge: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "KNOWLEDGE", ...config });
  },

  billing: (title: string, desc?: string, config?: Omit<ToastPayload, "title" | "description" | "category">) => {
    return toast.custom({ title, description: desc, category: "BILLING", ...config });
  },

  // Async Execution Resolution Handler Module Strategy
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: { title: string; desc?: string; category?: ToastCategory };
      success: (data: T) => { title: string; desc?: string; category?: ToastCategory; action?: ToastAction };
      error: (err: unknown) => { title: string; desc?: string; category?: ToastCategory };
    }
  ) => {
    const trackingId = toast.custom({
      title: messages.loading.title,
      description: messages.loading.desc,
      category: messages.loading.category || "INFO",
      metadata: { loadingStateProxy: true }
    });

    promise
      .then((resolvedData) => {
        if (trackingId) nativeSonnerToast.dismiss(trackingId);
        const nextParams = messages.success(resolvedData);
        toast.custom({
          title: nextParams.title,
          description: nextParams.desc,
          category: nextParams.category || "SUCCESS",
          action: nextParams.action,
          showProgress: true
        });
      })
      .catch((err: unknown) => {
        if (trackingId) nativeSonnerToast.dismiss(trackingId);
        const errorParams = messages.error(err);
        toast.custom({
          title: errorParams.title,
          description: errorParams.desc,
          category: errorParams.category || "ERROR",
          showProgress: true
        });
      });

    return promise;
  },

  // Global Orchestration Mechanics Clear Tool Link
  dismiss: (id?: string | number) => nativeSonnerToast.dismiss(id),
  clearAll: () => {
    nativeSonnerToast.dismiss();
    activeDeduplicationKeys.clear();
  },
  getTelemetryLog: (): TelemetryLog[] => [...telemetryStorageQueue]
};

// ============================================================================
// ENTERPRISE PLATFORM UNIFIED TOASTER STATE COMPONENT
// ============================================================================

export function Toaster() {
  const { theme = "system" } = useTheme();

  return (
    <div className="select-none pointer-events-none fixed inset-0 z-[9999]">
      <SonnerToaster
        theme={theme as "light" | "dark" | "system"}
        position="top-right"
        hotkey={["alt", "N"]} 
        expand={true}          
        visibleToasts={6}      
        gap={10}
        style={{
          fontFamily: "var(--font-sans), system-ui, sans-serif"
        }}
        toastOptions={{
          className: "pointer-events-auto bg-transparent border-none shadow-none p-0 w-full max-w-sm",
          style: {
            background: "transparent",
            border: "none",
            boxShadow: "none"
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// HOOKS EXPORT FOR EXTENDED OBSERVABILITY LAYERS
// ============================================================================

export function useNotificationCenter() {
  return {
    trigger: toast,
    getHistory: toast.getTelemetryLog,
    clearRegistry: toast.clearAll,
    activeKeysCount: activeDeduplicationKeys.size
  };
}