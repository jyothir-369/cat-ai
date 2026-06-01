"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { useAuth } from "@/hooks/useAuth";

// Icons represented as pure SVG components for complete design system consistency without adding heavy external production dependencies
const Icons = {
  Dashboard: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Chat: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Agents: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  Knowledge: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Workflows: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Integrations: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  Analytics: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Billing: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Settings: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Admin: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Bell: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Menu: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Terminal: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Sun: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
    </svg>
  ),
  Moon: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Cpu: () => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Globe: () => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  Refresh: () => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.212 8H17" />
    </svg>
  ),
  Database: () => (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  )
};

interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ComponentType;
  tooltip: string;
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Icons.Dashboard, tooltip: "Platform Infrastructure Overview" },
  { href: "/dashboard/chat", label: "Chat", icon: Icons.Chat, tooltip: "Advanced LLM Chat Interface" },
  { href: "/dashboard/agents", label: "Agents", icon: Icons.Agents, tooltip: "Autonomous Multi-Agent Orchestration" },
  { href: "/dashboard/knowledge", label: "Knowledge Base", icon: Icons.Knowledge, tooltip: "Vector DB & RAG Storage Context" },
  { href: "/dashboard/workflows", label: "Workflows", icon: Icons.Workflows, tooltip: "Visual AI Pipeline Automation" },
  { href: "/dashboard/integrations", label: "Integrations", icon: Icons.Integrations, tooltip: "Enterprise External API Ecosystem" },
  { href: "/dashboard/analytics", label: "Analytics", icon: Icons.Analytics, tooltip: "Token, Cost, & Inference Observability" },
  { href: "/dashboard/billing", label: "Billing", icon: Icons.Billing, tooltip: "Enterprise Subscriptions & Token Quotas" },
  { href: "/dashboard/settings", label: "Settings", icon: Icons.Settings, tooltip: "Global Infrastructure Configuration" },
  { href: "/dashboard/admin", label: "Admin", icon: Icons.Admin, tooltip: "Platform Governance & Access Controls" },
];

const WORKSPACES = [
  { id: "ws-1", name: "Production Grid", type: "Enterprise", region: "us-east-1" },
  { id: "ws-2", name: "Staging Cluster", type: "Staging", region: "us-west-2" },
  { id: "ws-3", name: "R&D Sandbox", type: "Development", region: "eu-central-1" }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Platform states layout architecture
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(WORKSPACES[0]);
  const [commandSearch, setCommandSearch] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const commandPaletteRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Command Palette global listeners (CMD+K or CTRL+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
        setIsProfileOpen(false);
        setIsWorkspaceOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Structural click-outside configuration handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(target)) {
        setIsCommandPaletteOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(target)) {
        setIsWorkspaceOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Secure Auth State Redirect Evaluation Route Protection Loop Guard
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border-2 border-[#1e1e24] border-t-[#0070f3] animate-spin" />
          <span className="text-[10px] font-mono tracking-widest text-[#a1a1aa] uppercase animate-pulse">CAT</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Real-time breadcrumb construction engine parsing path layout matrix arrays
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === pathSegments.length - 1;
    return { href, label, isLast };
  });

  // Comprehensive execution routing arrays map for CMD+K core operational schema
  const commandFilteredItems = SIDEBAR_ITEMS.filter(item =>
    item.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
    item.tooltip.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const handleCommandRoute = (href: string) => {
    router.push(href);
    setIsCommandPaletteOpen(false);
    setCommandSearch("");
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-[#edeeee] font-sans antialiased selection:bg-[#0070f3]/30 selection:text-white ${isDarkMode ? "bg-[#09090b]" : "bg-[#f4f4f5] text-[#18181b]"}`}>
      
      {/* BACKGROUND GRAPHICS / GLASSMORPHIC GRADIENT BLURS */}
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-[#0070f3]/5 blur-[140px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 -z-10 h-[600px] w-[600px] rounded-full bg-[#7928ca]/5 blur-[180px]" />

      {/* MOBILE DRAWER SIDEBAR BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* COMPACT & RESPONSIVE HIGH-FIDELITY SIDEBAR NODE */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#1e1e24]/60 bg-[#09090b]/80 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:z-0
          ${isSidebarCollapsed ? "w-[68px]" : "w-[240px]"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* LOGO & ARCHITECTURAL ANCHOR STRIP */}
        <div className="flex h-14 items-center justify-between border-b border-[#1e1e24]/60 px-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0070f3] to-[#7928ca] p-[1px] shadow-lg shadow-[#0070f3]/10">
              <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-[#09090b]">
                <span className="text-xs font-black tracking-tighter text-white">C</span>
              </div>
            </div>
            {!isSidebarCollapsed && (
              <span className="bg-gradient-to-r from-white via-[#edeeee] to-[#a1a1aa] bg-clip-text text-sm font-bold tracking-tight text-transparent">
                CAT AI <span className="ml-1 text-[9px] font-mono font-medium tracking-normal text-[#0070f3] bg-[#0070f3]/10 px-1 py-0.5 rounded border border-[#0070f3]/20">v1.0</span>
              </span>
            )}
          </div>

          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden rounded-md p-1 text-[#71717a] hover:bg-[#1e1e24]/50 hover:text-white transition-colors lg:block focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
            aria-label="Toggle Collapse Sidebar"
          >
            <svg className={`h-4 w-4 transform transition-transform duration-200 ${isSidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* WORKSPACE SWITCHER ANCHOR WRAPPER */}
        <div className="p-3 border-b border-[#1e1e24]/40" ref={workspaceRef}>
          <button
            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-[#1e1e24]/60 bg-[#141416]/50 p-2 text-left transition-all hover:bg-[#1e1e24]/40 focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#1e1e24] text-[10px] font-mono font-bold text-[#a1a1aa] border border-[#2e2e38]">
                {currentWorkspace.name.charAt(0)}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#edeeee]">{currentWorkspace.name}</p>
                  <p className="truncate text-[9px] font-mono text-[#71717a] uppercase">{currentWorkspace.type}</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[#71717a]"><Icons.ChevronDown /></span>
            )}
          </button>

          {/* ACTIVE DISPATCH WORKSPACE SELECTION MODAL LAYER */}
          {isWorkspaceOpen && !isSidebarCollapsed && (
            <div className="absolute left-3 right-3 mt-1 z-50 rounded-xl border border-[#1e1e24] bg-[#0c0c0e]/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-2 py-1 text-[9px] font-mono text-[#71717a] uppercase tracking-wider">Context Workspaces</div>
              {WORKSPACES.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setIsWorkspaceOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${currentWorkspace.id === ws.id ? "bg-[#0070f3]/10 text-white font-medium" : "text-[#a1a1aa] hover:bg-[#1e1e24]/50 hover:text-white"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate">{ws.name}</p>
                    <p className="text-[9px] opacity-60 font-mono">{ws.region}</p>
                  </div>
                  {currentWorkspace.id === ws.id && (
                    <div className="h-1 w-1 rounded-full bg-[#0070f3]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ENTERPRISE CORE ROUTING PLATFORM NAV STACK */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3 custom-scrollbar">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium tracking-wide transition-all duration-200 relative focus:outline-none focus:ring-1 focus:ring-[#0070f3]/50
                    ${isActive 
                      ? "bg-[#141416] text-white border border-[#2e2e38]/50 shadow-inner" 
                      : "text-[#a1a1aa] hover:bg-[#141416]/40 hover:text-white border border-transparent"
                    }`}
                >
                  {/* Micro interaction active border indicator node pill */}
                  {isActive && (
                    <div className="absolute left-0 top-1/4 h-1/2 w-[2px] rounded-r-md bg-[#0070f3]" />
                  )}
                  <div className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-[#0070f3]" : "text-[#71717a] group-hover:text-[#a1a1aa]"}`}>
                    <item.icon />
                  </div>
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>

                {/* ADVANCED FLOATING TOOLTIP NODE SYSTEM */}
                {isSidebarCollapsed && (
                  <div className="pointer-events-none absolute left-14 top-1/2 z-50 -translate-y-1/2 translate-x-2 rounded-md border border-[#1e1e24] bg-[#0c0c0e] px-2 py-1.5 text-[10px] font-medium text-white shadow-xl opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 whitespace-nowrap backdrop-blur-md">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-[9px] font-normal text-[#71717a]">{item.tooltip}</p>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* REAL-TIME ENTERPRISE INFRASTRUCTURE OPERATIONAL CAPACITY MONITOR */}
        {!isSidebarCollapsed && (
          <div className="mx-3 my-2 rounded-xl border border-[#1e1e24]/40 bg-[#141416]/30 p-2.5 font-mono text-[10px]">
            <div className="flex items-center justify-between text-[#71717a] mb-1">
              <span>PLATFORM QUOTA</span>
              <span className="text-[#0070f3] font-bold">84%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-[#1e1e24] overflow-hidden">
              <div className="h-full w-[84%] bg-gradient-to-r from-[#0070f3] to-[#7928ca]" />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[9px] text-[#52525b]">
              <span>$420.12 left</span>
              <span>Reset 3d</span>
            </div>
          </div>
        )}

        {/* PLATFORM SECURE DEPLOYMENT USER PROFILE MATRIX BAR */}
        <div className="border-t border-[#1e1e24]/60 bg-[#0c0c0e]/40 p-3" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-all hover:bg-[#141416] focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
          >
            <div className="relative h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr from-[#0070f3] to-[#7928ca] p-[1.5px] shadow-md">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#09090b] text-[10px] font-bold text-white uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#09090b] bg-[#10b981]" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white leading-none mb-0.5">{user.name}</p>
                <p className="truncate text-[10px] text-[#71717a] leading-none">{user.email}</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <span className="text-[#71717a]"><Icons.ChevronDown /></span>
            )}
          </button>

          {/* SYSTEM USER DROPDOWN MODAL EXPANSION VIEW */}
          {isProfileOpen && (
            <div className={`absolute bottom-16 z-50 rounded-xl border border-[#1e1e24] bg-[#0c0c0e]/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 ${isSidebarCollapsed ? "left-14 w-48" : "left-3 right-3"}`}>
              <div className="px-2 py-1 text-[9px] font-mono text-[#71717a] uppercase tracking-wider border-b border-[#1e1e24]/40 mb-1">Identity & Account</div>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#a1a1aa] hover:bg-[#1e1e24]/50 hover:text-white transition-colors">
                <svg className="h-3.5 w-3.5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Profile Settings
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#a1a1aa] hover:bg-[#1e1e24]/50 hover:text-white transition-colors">
                <svg className="h-3.5 w-3.5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Workspace Infrastructure
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#a1a1aa] hover:bg-[#1e1e24]/50 hover:text-white transition-colors">
                <svg className="h-3.5 w-3.5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                API Credentials
              </button>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#a1a1aa] hover:bg-[#1e1e24]/50 hover:text-white transition-colors">
                <svg className="h-3.5 w-3.5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Security Policy Compliance
              </button>
              <div className="h-[1px] bg-[#1e1e24] my-1" />
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" /></svg>
                De-authenticate Layout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* PRIMARY MASTER FLUID CONTAINER CONTENT VIEWPORT */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        
        {/* TOP LEVEL REALTIME META DESKTOP NAVIGATION BAR */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1e1e24]/60 bg-[#09090b]/40 backdrop-blur-xl px-4 lg:px-6">
          
          {/* BREADCRUMB SYSTEMS & DRAWER TOGGLE TRIGGER BUTTON */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#1e1e24]/50 hover:text-white lg:hidden focus:outline-none"
              aria-label="Open Mobile Core Menu"
            >
              <Icons.Menu />
            </button>

            {/* HIGH-FIDELITY BREADCRUMBS PATTERN PATH DISCOVERY */}
            <nav className="hidden items-center space-x-1.5 text-xs font-medium text-[#71717a] md:flex" aria-label="Breadcrumb Dynamic Contextual Matrix">
              <Link href="/dashboard" className="transition-colors hover:text-[#a1a1aa]">Platform</Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <span className="text-[#3f3f46]">/</span>
                  <Link
                    href={crumb.href}
                    className={`transition-colors ${crumb.isLast ? "text-white font-semibold cursor-default pointer-events-none" : "hover:text-[#a1a1aa]"}`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* OPERATIONS ENGINE TOP BAR RIGGING PLATFORM CONTROLS CONTROLLER SECTION */}
          <div className="flex items-center gap-4">
            
            {/* OMNIPRESENT HOTKEY TRIGGER SEARCH INPUT BANNER NODE */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden w-52 items-center justify-between rounded-lg border border-[#1e1e24]/60 bg-[#141416]/40 px-2.5 py-1.5 text-left text-xs text-[#71717a] hover:border-[#2e2e38] hover:bg-[#141416]/80 transition-all focus:outline-none sm:flex md:w-64"
            >
              <div className="flex items-center gap-1.5">
                <Icons.Search />
                <span>Search execution space...</span>
              </div>
              <kbd className="hidden rounded bg-[#1e1e24] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#a1a1aa] border border-[#2e2e38] sm:inline-block">
                ⌘K
              </kbd>
            </button>

            {/* AMBIENT INTELLIGENT CAP-EX TOKEN REMAINING INDICATOR METER BANNER */}
            <div className="hidden items-center gap-3.5 border-l border-r border-[#1e1e24]/60 px-4 font-mono text-[11px] lg:flex">
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-[#71717a] font-sans">CREDITS REMAINING</span>
                <span className="font-bold text-white tracking-wide">$2,841.90</span>
              </div>
              <div className="flex h-7 w-[1px] bg-[#1e1e24]" />
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-[#71717a] font-sans">INFERENCE METRIC</span>
                <span className="text-emerald-400 font-bold">99.98%</span>
              </div>
            </div>

            {/* DESIGN SYSTEM LIGHT / DARK MODE TOGGLE SCHEDULER SWITCH */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-lg border border-[#1e1e24]/60 p-2 text-[#a1a1aa] hover:bg-[#141416] hover:text-white transition-all focus:outline-none"
              aria-label="Toggle Interface Color Workspace Scheme"
            >
              {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>

            {/* NOTIFICATION HUB ALERTS CENTER NODE CONTEXT CONTAINER */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative rounded-lg border border-[#1e1e24]/60 p-2 text-[#a1a1aa] hover:bg-[#141416] hover:text-white transition-all focus:outline-none"
                aria-label="System Message Dispatch Console Log"
              >
                <Icons.Bell />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#0070f3] animate-pulse" />
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 z-50 w-80 rounded-xl border border-[#1e1e24] bg-[#0c0c0e]/95 p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-[#1e1e24]/40 pb-2 mb-1 px-2">
                    <span className="text-xs font-bold text-white">Platform Signals</span>
                    <span className="text-[9px] font-mono text-[#0070f3] cursor-pointer hover:underline">Mark all acknowledged</span>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="rounded-lg p-2 hover:bg-[#141416] transition-colors cursor-pointer text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-emerald-400">RAG Synced</span>
                        <span className="text-[9px] font-mono text-[#52525b]">2m ago</span>
                      </div>
                      <p className="text-[10px] text-[#a1a1aa] line-clamp-2 leading-relaxed">Vector base cluster updated successfully. 14,249 embeddings index refreshed.</p>
                    </div>
                    <div className="rounded-lg p-2 hover:bg-[#141416] transition-colors cursor-pointer text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-amber-400">Model Throttling Warn</span>
                        <span className="text-[9px] font-mono text-[#52525b]">1h ago</span>
                      </div>
                      <p className="text-[10px] text-[#a1a1aa] line-clamp-2 leading-relaxed">Cluster routing matrix high-latency notice on gpt-4o structural fallback nodes.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* COMPREHENSIVE CHILD CONTENT EXPANSION INTERNALS EMBED BLOCK */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative focus:outline-none">
          {children}
        </section>

        {/* ENTERPRISE REAL-TIME AI OPERATING SYSTEM CLUSTER HEALTH STATUS MONITORS FOOTER BAR */}
        <footer className="flex h-9 shrink-0 items-center justify-between border-t border-[#1e1e24]/60 bg-[#09090b]/80 backdrop-blur-xl px-4 font-mono text-[10px] text-[#71717a] overflow-x-auto overflow-y-hidden select-none custom-scrollbar-horizontal">
          <div className="flex items-center gap-5 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[#a1a1aa]"><Icons.Terminal /> SYSTEM ARCHITECTURE:</span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-400 inline-block animate-pulse" /> CORE NOMINAL
              </span>
            </div>
            <div className="h-3 w-[1px] bg-[#1e1e24]" />
            <div className="flex items-center gap-1">
              <Icons.Cpu />
              <span>MODEL INFERENCE INGESTION: </span>
              <span className="text-white font-semibold">94,204 t/sec</span>
            </div>
            <div className="h-3 w-[1px] bg-[#1e1e24]" />
            <div className="flex items-center gap-1">
              <Icons.Database />
              <span>VECTOR DB SYNC METRIC: </span>
              <span className="text-[#0070f3] font-semibold">0.4ms Latency</span>
            </div>
            <div className="h-3 w-[1px] bg-[#1e1e24]" />
            <div className="flex items-center gap-1">
              <Icons.Globe />
              <span>NODE PIPELINE: </span>
              <span className="text-white font-semibold">419 Active Workers</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 whitespace-nowrap">
            <Icons.Refresh />
            <span>GLOBAL REPLICA STATUS: </span>
            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 text-[9px]">SECURE PLATFORM SYNCED</span>
          </div>
        </footer>

        {/* HIGH-FIDELITY CMD+K RAYCAST/LINEAR-INSPIRED OMNI COMMAND PALETTE SYSTEM */}
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-md pt-[10vh] px-4 animate-in fade-in duration-150">
            <div 
              ref={commandPaletteRef}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#2e2e38] bg-[#0c0c0e]/95 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
            >
              {/* PLATFORM UNIFIED BAR INTERNALS FIELD */}
              <div className="flex items-center border-b border-[#1e1e24] px-4 py-3.5">
                <div className="text-[#a1a1aa] mr-3"><Icons.Search /></div>
                <input
                  type="text"
                  placeholder="Type an infrastructure operational task or workspace route command..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-[#52525b] outline-none border-none focus:ring-0"
                  autoFocus
                />
                <button 
                  onClick={() => setIsCommandPaletteOpen(false)}
                  className="rounded bg-[#1e1e24] p-1 text-[10px] font-mono text-[#a1a1aa] border border-[#2e2e38] hover:text-white"
                >
                  ESC
                </button>
              </div>

              {/* SEARCH RESULTS SYSTEM LIST VIEWS ITERATION BOX */}
              <div className="max-h-[340px] overflow-y-auto p-2 custom-scrollbar">
                <div className="px-2 py-1 text-[9px] font-mono text-[#71717a] uppercase tracking-wider">System Navigation Dispatch Controls</div>
                {commandFilteredItems.length > 0 ? (
                  commandFilteredItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleCommandRoute(item.href)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-[#a1a1aa] hover:bg-[#1e1e24]/60 hover:text-white transition-all group focus:outline-none focus:bg-[#1e1e24]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-[#71717a] group-hover:text-[#0070f3] transition-colors">
                          <item.icon />
                        </div>
                        <div>
                          <p className="font-semibold text-[#edeeee]">{item.label}</p>
                          <p className="text-[10px] text-[#71717a]">{item.tooltip}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 text-[#0070f3] transition-opacity">Execute Route ↵</span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-[#71717a] font-mono">
                    No active infrastructure operational task match found.
                  </div>
                )}
              </div>

              {/* DOCK BAR KEY ACTIONS SCHEMATIC FOOTER PANEL */}
              <div className="flex items-center justify-between border-t border-[#1e1e24] bg-[#141416]/40 px-4 py-2 text-[10px] font-mono text-[#52525b]">
                <div className="flex gap-4">
                  <span><kbd className="bg-[#1e1e24] px-1 rounded text-[#a1a1aa]">↑↓</kbd> Traverse Grid</span>
                  <span><kbd className="bg-[#1e1e24] px-1 rounded text-[#a1a1aa]">↵</kbd> Dispatch Engine</span>
                </div>
                <span>CAT OS Global Deployment Command Core</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}