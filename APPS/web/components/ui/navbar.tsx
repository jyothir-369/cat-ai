"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Bell, 
  Plus, 
  ChevronRight, 
  Command, 
  Globe, 
  Zap,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// DESIGN TOKENS & CVA ARCHITECTURE
// ============================================================================

const navbarVariants = cva(
  "sticky top-0 z-40 w-full border-b border-zinc-900 bg-[#050507]/80 backdrop-blur-md transition-all duration-300",
  {
    variants: {
      sticky: {
        true: "bg-[#050507]/80 backdrop-blur-md border-zinc-900",
        false: "bg-transparent border-transparent",
      },
    },
    defaultVariants: {
      sticky: true,
    },
  }
);

// ============================================================================
// CORE COMPONENT IMPLEMENTATION
// ============================================================================

export const Navbar = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <header className={cn(navbarVariants(), className)} {...props}>
    <div className="mx-auto flex h-14 items-center justify-between px-4 lg:px-6">
      {children}
    </div>
  </header>
);

export const NavbarBrand = () => (
  <div className="flex items-center gap-3 mr-6">
    <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-950/20">
      <span className="font-mono text-xs font-black text-white tracking-tighter">C</span>
    </div>
    <div className="hidden md:flex flex-col">
      <span className="font-mono text-[11px] font-black tracking-widest text-zinc-100 uppercase leading-none">CAT AI</span>
      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Enterprise OS</span>
    </div>
  </div>
);

export const NavbarBreadcrumbs = ({ items }: { items: { label: string; href: string }[] }) => (
  <nav className="hidden md:flex items-center gap-2 text-[11px] font-medium text-zinc-500" aria-label="Breadcrumb">
    {items.map((item, i) => (
      <React.Fragment key={item.href}>
        <a href={item.href} className="hover:text-zinc-200 transition-colors uppercase font-mono tracking-wide">
          {item.label}
        </a>
        {i < items.length - 1 && <ChevronRight className="h-3 w-3 opacity-50" />}
      </React.Fragment>
    ))}
  </nav>
);

export const NavbarSearch = () => (
  <button 
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-700 transition-all text-xs text-zinc-500 w-full max-w-[240px] focus:outline-none focus:ring-1 focus:ring-zinc-700"
    onClick={() => window.dispatchEvent(new CustomEvent("cat-ai-search-open"))}
  >
    <Search className="h-3.5 w-3.5" />
    <span className="truncate">Search intelligence...</span>
    <kbd className="ml-auto flex items-center gap-0.5 font-mono text-[9px] font-black bg-zinc-900 px-1 py-0.5 rounded">
      <Command className="h-2 w-2" /> K
    </kbd>
  </button>
);

export const NavbarActions = () => (
  <div className="flex items-center gap-2 ml-4">
    <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold transition-all">
      <Plus className="h-3.5 w-3.5" /> New Agent
    </button>
  </div>
);

export const NavbarNotifications = ({ count = 3 }: { count?: number }) => (
  <button className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all">
    <Bell className="h-4 w-4" />
    {count > 0 && (
      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-[#050507]" />
    )}
  </button>
);

export const NavbarProfile = ({ user }: { user: { name: string; email: string } }) => (
  <div className="ml-4 flex items-center gap-3 pl-4 border-l border-zinc-900">
    <div className="hidden md:flex flex-col items-end">
      <span className="text-[11px] font-bold text-zinc-200">{user.name}</span>
      <span className="text-[9px] text-zinc-500">{user.email}</span>
    </div>
    <button className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white border border-zinc-700">
      {user.name.slice(0, 2).toUpperCase()}
    </button>
  </div>
);

// ============================================================================
// COMPOSABLE NAVBAR IMPLEMENTATION EXAMPLE
// ============================================================================

export const ProductionNavbar = () => {
  return (
    <Navbar>
      <div className="flex items-center">
        <NavbarBrand />
        <NavbarBreadcrumbs items={[
          { label: "Dashboard", href: "/" },
          { label: "Workflows", href: "/workflows" }
        ]} />
      </div>

      <div className="flex-1 flex justify-center px-4">
        <NavbarSearch />
      </div>

      <div className="flex items-center">
        <NavbarActions />
        <NavbarNotifications count={3} />
        <NavbarProfile user={{ name: "Alex AI", email: "alex@cat.ai" }} />
      </div>
    </Navbar>
  );
};