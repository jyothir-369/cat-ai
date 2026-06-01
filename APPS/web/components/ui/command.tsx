"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// COMMAND PALETTE PRIMITIVES
// ============================================================================

export const CommandDialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) => {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-[50%] top-[15%] z-50 w-full max-w-[600px] translate-x-[-50%] overflow-hidden rounded-xl border border-zinc-900 bg-[#050507]/90 shadow-2xl backdrop-blur-xl"
          >
            <CommandPrimitive className="flex h-full w-full flex-col overflow-hidden">
              {children}
            </CommandPrimitive>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const CommandInput = (props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) => (
  <div className="flex items-center border-b border-zinc-900 px-4" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
    <CommandPrimitive.Input
      {...props}
      className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-600 text-zinc-100"
    />
  </div>
);

export const CommandList = (props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2" {...props} />
);

export const CommandItem = (props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    {...props}
    className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-xs text-zinc-400 outline-none data-[selected=true]:bg-zinc-900 data-[selected=true]:text-zinc-100 transition-colors"
  />
);

export const CommandGroup = (props: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>) => (
  <CommandPrimitive.Group className="py-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:text-zinc-600 [&_[cmdk-group-heading]]:uppercase" {...props} />
);