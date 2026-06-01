"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// PRIMITIVE SKELETON ENGINE
// ============================================================================

export const Skeleton = ({
  className,
  animate = "pulse",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { animate?: "pulse" | "shimmer" }) => {
  return (
    <div
      className={cn(
        "rounded-md bg-zinc-900",
        animate === "pulse" && "animate-pulse",
        animate === "shimmer" && "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-zinc-800/50 before:to-transparent",
        className
      )}
      role="status"
      aria-busy="true"
      {...props}
    />
  );
};

// ============================================================================
// COMPOSABLE UI PATTERNS
// ============================================================================

export const SkeletonAvatar = () => <Skeleton className="h-10 w-10 rounded-full" />;

export const SkeletonText = ({ lines = 1 }: { lines?: number }) => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn("h-3 w-full", i === lines - 1 && "w-2/3")} />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-6 space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <SkeletonText lines={3} />
    <Skeleton className="h-10 w-full" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="w-full space-y-3">
    <Skeleton className="h-10 w-full mb-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
    <Skeleton className="h-64 w-full" />
    <SkeletonTable rows={5} />
  </div>
);