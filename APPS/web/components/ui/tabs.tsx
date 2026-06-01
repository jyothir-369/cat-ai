"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================================
// DESIGN SYSTEM TOKENS & CVA ARCHITECTURE
// ============================================================================

const listVariants = cva("flex items-center gap-1 select-none", {
  variants: {
    variant: {
      default: "border-b border-zinc-900",
      underline: "border-b border-zinc-900",
      pills: "bg-zinc-950 p-1 rounded-xl border border-zinc-900 inline-flex",
      segmented: "bg-zinc-950 p-0.5 rounded-lg border border-zinc-900 inline-flex",
    },
  },
  defaultVariants: { variant: "default" },
});

const triggerVariants = cva(
  "relative flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-all duration-200 outline-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "text-zinc-500 hover:text-zinc-200 data-[state=active]:text-zinc-100",
        underline: "text-zinc-500 hover:text-zinc-200 data-[state=active]:text-zinc-100",
        pills: "rounded-lg text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm",
        segmented: "rounded-md text-zinc-400 hover:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm",
      },
    },
  }
);

// ============================================================================
// CONTEXT PRIMITIVE
// ============================================================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: VariantProps<typeof listVariants>["variant"];
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

// ============================================================================
// SYSTEM COMPONENTS
// ============================================================================

export const Tabs = ({ 
  defaultValue, 
  value, 
  onValueChange, 
  variant = "underline", 
  children 
}: { 
  defaultValue?: string; 
  value?: string; 
  onValueChange?: (val: string) => void; 
  variant?: VariantProps<typeof listVariants>["variant"]; 
  children: React.ReactNode 
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = (val: string) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const { variant } = React.useContext(TabsContext)!;
  return <div role="tablist" className={cn(listVariants({ variant }), className)}>{children}</div>;
};

export const TabsTrigger = ({ 
  value, 
  badge, 
  loading, 
  children 
}: { 
  value: string; 
  badge?: string | number; 
  loading?: boolean; 
  children: React.ReactNode 
}) => {
  const { activeTab, setActiveTab, variant } = React.useContext(TabsContext)!;
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => setActiveTab(value)}
      className={cn(triggerVariants({ variant }))}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : children}
      {badge && (
        <span className="ml-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">
          {badge}
        </span>
      )}
      {isActive && variant === "underline" && (
        <motion.div
          layoutId="tab-underline"
          className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-indigo-500"
        />
      )}
    </button>
  );
};

export const TabsContent = ({ value, children }: { value: string; children: React.ReactNode }) => {
  const { activeTab } = React.useContext(TabsContext)!;
  if (activeTab !== value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      role="tabpanel"
    >
      {children}
    </motion.div>
  );
};