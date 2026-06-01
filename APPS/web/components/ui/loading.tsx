"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================================
// PRIMITIVE LOADERS
// ============================================================================

export const LoadingSpinner = ({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeMap = { sm: "h-3 w-3", md: "h-5 w-5", lg: "h-8 w-8" };
  return <Loader2 className={cn("animate-spin text-indigo-500", sizeMap[size], className)} />;
};

export const LoadingBar = ({ progress = 0 }: { progress: number }) => (
  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
    <motion.div 
      className="h-full bg-indigo-500"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ type: "spring", stiffness: 100 }}
    />
  </div>
);

// ============================================================================
// ENTERPRISE OVERLAY & FULL-SCREEN
// ============================================================================

export const LoadingOverlay = ({ loading, children }: { loading: boolean; children?: React.ReactNode }) => (
  <div className="relative w-full h-full">
    <AnimatePresence>
      {loading && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest animate-pulse">
              Initializing AI Engine...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    <div className={cn(loading && "opacity-50 pointer-events-none transition-opacity")}>{children}</div>
  </div>
);

// ============================================================================
// AI-SPECIFIC LOADING MESSAGES
// ============================================================================

export const AIStatusMessage = () => {
  const messages = [
    "Building Context Memory...",
    "Connecting Vector Database...",
    "Generating Embeddings...",
    "Analyzing Document Patterns...",
    "Synchronizing Workflow Graph..."
  ];
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % messages.length), 3000);
    return () => clearInterval(interval);
  }, []);

  return <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{messages[index]}</p>;
};