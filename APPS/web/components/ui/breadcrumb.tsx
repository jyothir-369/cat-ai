"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, MoreHorizontal, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// MAPPING: ID RESOLVER (Enterprise Metadata Registry)
// ============================================================================

const LabelRegistry: Record<string, string> = {
  "workflows": "Workflows",
  "knowledge": "Knowledge Base",
  "admin": "Administration",
  "billing": "Billing Engine",
  "abc123": "Customer Approval Pipeline", // Example dynamic resolution
};

// ============================================================================
// PRIMITIVES
// ============================================================================

export const Breadcrumb = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
    <ol className="flex items-center gap-1.5">{children}</ol>
  </nav>
);

export const BreadcrumbList = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const BreadcrumbItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-center gap-1.5">{children}</li>
);

export const BreadcrumbLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors uppercase font-mono tracking-wide">
    {children}
  </Link>
);

export const BreadcrumbPage = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] font-bold text-zinc-100 uppercase font-mono tracking-wide truncate max-w-[200px]" aria-current="page">
    {children}
  </span>
);

export const BreadcrumbSeparator = () => (
  <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
);

export const BreadcrumbEllipsis = () => (
  <span className="flex items-center justify-center h-6 w-6 text-zinc-500">
    <MoreHorizontal className="h-4 w-4" />
  </span>
);

// ============================================================================
// AUTOMATIC ROUTE GENERATOR
// ============================================================================

export const AutoBreadcrumbs = () => {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <BreadcrumbLink href="/dashboard"><Home className="h-3.5 w-3.5" /></BreadcrumbLink>
      </BreadcrumbItem>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = LabelRegistry[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        );
      })}
    </Breadcrumb>
  );
};