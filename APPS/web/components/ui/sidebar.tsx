"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Terminal, 
  Database, 
  Layers, 
  Blocks, 
  CreditCard, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  Search, 
  ChevronDown, 
  ChevronsLeftRight, 
  Menu, 
  X, 
  Loader2,
  Bell,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// DESIGN SYSTEM TOKENS & CVA CONFIGURATION
// ============================================================================

const sidebarVariants = cva(
  "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-900 bg-[#050507] text-zinc-200 transition-all duration-300 ease-in-out select-none font-sans",
  {
    variants: {
      collapsed: {
        true: "w-[68px]",
        false: "w-[260px]",
      },
      mobileOpen: {
        true: "translate-x-0 w-[280px] z-50",
        false: "max-md:-translate-x-full",
      }
    },
    defaultVariants: {
      collapsed: false,
      mobileOpen: false,
    }
  }
);

export type SidebarRoleType = "Admin" | "Manager" | "Analyst" | "Operator" | "Developer" | "Viewer";

export interface SidebarTelemetryPayload {
  userId?: string;
  currentWorkspace: string;
  role: SidebarRoleType;
}

interface SidebarContextProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  activeRole: SidebarRoleType;
  selectedWorkspace: string;
  setSelectedWorkspace: (workspace: string) => void;
  telemetry?: SidebarTelemetryPayload;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(undefined);

export const useSidebarContext = () => {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("<Sidebar /> subcomponents must be initialized within a <Sidebar /> core layout frame node.");
  return context;
};

// Global instrumentation pipeline reporting channel
const dispatchSidebarTelemetry = (
  payload: SidebarTelemetryPayload | undefined, 
  action: "navigation_click" | "workspace_switch" | "search_trigger"
) => {
  if (process.env.NODE_ENV === "development" && payload) {
    console.debug(`[CAT AI SIDEBAR TELEMETRY]: ${action.toUpperCase()} | Role: ${payload.role} | Active Workspace: ${payload.currentWorkspace}`);
  }
};

// ============================================================================
// COMPONENT IMPLEMENTATION: SIDEBAR ORCHESTRATOR ROOT
// ============================================================================

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultCollapsed?: boolean;
  activeRole?: SidebarRoleType;
  defaultWorkspace?: string;
  telemetry?: SidebarTelemetryPayload;
}

export const Sidebar: React.FC<SidebarProps> = ({
  defaultCollapsed = false,
  activeRole = "Admin",
  defaultWorkspace = "Workspace Enterprise",
  telemetry,
  className,
  children,
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState(defaultWorkspace);

  const contextValue = React.useMemo(() => ({
    isCollapsed,
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen,
    activeRole,
    selectedWorkspace,
    setSelectedWorkspace,
    telemetry,
  }), [isCollapsed, isMobileOpen, activeRole, selectedWorkspace, telemetry]);

  return (
    <SidebarContext.Provider value={contextValue}>
      {/* Mobile Backdrop Overlay Track blur panel */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Global Interactive Mobile Header Trigger Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 border-b border-zinc-900 bg-[#050507]/80 backdrop-blur-md flex items-center justify-between px-4 z-30 md:hidden select-none">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-950/20">
            <span className="font-mono text-xs font-black text-white tracking-tighter">C</span>
          </div>
          <span className="font-mono text-xs font-black tracking-widest text-zinc-100 uppercase">CAT AI</span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-800"
          aria-label="Toggle structural layout responsive system navigation viewport drawer drawer menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <aside
        aria-label="Application Main Panel Side Navigation Shell Frame"
        className={cn(sidebarVariants({ collapsed: isCollapsed, mobileOpen: isMobileOpen }), className)}
        {...props}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
};

// ============================================================================
// SIDEBAR ELEMENT MODULE: HEADER LOGO AREA
// ============================================================================

export const SidebarHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  const { isCollapsed, setIsMobileOpen } = useSidebarContext();

  return (
    <div
      className={cn(
        "h-14 border-b border-zinc-900/60 px-4 flex items-center justify-between shrink-0 select-none",
        isCollapsed && "justify-center px-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-950/10">
          <span className="font-mono text-xs font-black text-white tracking-tighter">C</span>
        </div>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="font-mono text-xs font-black tracking-widest text-zinc-100 uppercase leading-none">CAT AI</span>
            <span className="text-[9px] font-mono font-bold text-zinc-600 tracking-wider uppercase mt-0.5">Core OS v14.2</span>
          </motion.div>
        )}
      </div>

      {/* Internal Viewport Close Action Anchor specifically for Mobile Drawers Layout frames */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(false)}
        className="rounded-lg p-1 text-zinc-500 hover:text-zinc-200 md:hidden"
        aria-label="Dismiss dashboard navigation overlay drawer drawer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// ============================================================================
// SIDEBAR ELEMENT MODULE: GLOBAL CMD+K SEARCH BOX PLUG
// ============================================================================

export const SidebarSearch: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  const { isCollapsed, telemetry } = useSidebarContext();

  const handleSearchActionIntercept = () => {
    if (telemetry) dispatchSidebarTelemetry(telemetry, "search_trigger");
    // Global orchestration pipeline placeholder action mapping context trigger pattern binding loop hook anchor
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cat-ai-global-search-open"));
    }
  };

  React.useEffect(() => {
    const handleGlobalMetaKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleSearchActionIntercept();
      }
    };
    window.addEventListener("keydown", handleGlobalMetaKeydown);
    return () => window.removeEventListener("keydown", handleGlobalMetaKeydown);
  }, [telemetry]);

  if (isCollapsed) {
    return (
      <div className="px-3 my-2 flex justify-center shrink-0">
        <button
          type="button"
          onClick={handleSearchActionIntercept}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 bg-zinc-950 border border-zinc-900/60 hover:border-zinc-800 transition-all outline-none"
          title="Search Console Command Shell (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("px-4 my-3 shrink-0 select-none", className)} {...props}>
      <button
        type="button"
        onClick={handleSearchActionIntercept}
        className="w-full h-8 rounded-lg bg-zinc-950 border border-zinc-900/60 hover:border-zinc-800 text-left px-2.5 flex items-center justify-between text-zinc-500 hover:text-zinc-400 transition-all font-sans text-xs outline-none"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span>Search workspaces...</span>
        </div>
        <kbd className="font-mono text-[9px] font-black bg-zinc-900 border border-zinc-800/80 rounded px-1.5 py-0.2 text-zinc-600 tracking-tighter shadow-inner">
          ⌘K
        </kbd>
      </button>
    </div>
  );
};

// ============================================================================
// SIDEBAR ELEMENT MODULE: MULTI-TENANT WORKSPACE SWITCHER
// ============================================================================

export const SidebarWorkspaceSwitcher: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  const { isCollapsed, selectedWorkspace, setSelectedWorkspace, telemetry } = useSidebarContext();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const workspaces = [
    { name: "Workspace Alpha", type: "Sandbox", badge: "Dev", usage: "34%" },
    { name: "Workspace Beta", type: "Staging", badge: "Free", usage: "88%" },
    { name: "Workspace Enterprise", type: "Production", badge: "Ent", usage: "12%" },
    { name: "Workspace Sandbox", type: "Testing", badge: "Custom", usage: "2%" },
  ];

  const activeData = workspaces.find(w => w.name === selectedWorkspace) || workspaces[2];

  const handleSelectionCycle = (workspaceName: string) => {
    setSelectedWorkspace(workspaceName);
    setDropdownOpen(false);
    if (telemetry) {
      dispatchSidebarTelemetry({
        ...telemetry,
        currentWorkspace: workspaceName
      }, "workspace_switch");
    }
  };

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideInteraction = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideInteraction);
    return () => document.removeEventListener("mousedown", handleOutsideInteraction);
  }, [dropdownOpen]);

  return (
    <div ref={triggerRef} className={cn("px-4 mb-2 relative shrink-0 select-none z-30", isCollapsed && "px-3 text-center", className)} {...props}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={cn(
          "w-full rounded-xl border border-zinc-900 bg-zinc-950 p-2 flex items-center justify-between text-left hover:border-zinc-800 transition-all outline-none",
          isCollapsed && "p-1.5 justify-center"
        )}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 font-mono text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
            {activeData.name.split(" ")[1]?.[0] || "W"}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-zinc-200 truncate leading-tight">{activeData.name}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-mono text-zinc-500 uppercase font-black tracking-tight">{activeData.type}</span>
                <span className="text-[8px] font-sans bg-purple-950/40 text-purple-400 border border-purple-900/30 rounded px-1 font-black uppercase leading-none scale-[0.9] origin-left">
                  {activeData.badge}
                </span>
              </div>
            </div>
          )}
        </div>
        {!isCollapsed && <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", dropdownOpen && "rotate-180")} />}
      </button>

      {/* Custom Context Menu Dropdown Interface Portal Overlay */}
      <AnimatePresence>
        {dropdownOpen && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-4 right-4 top-[105%] mt-1 rounded-xl border border-zinc-900 bg-zinc-950 p-1.5 shadow-2xl backdrop-blur-md flex flex-col gap-0.5 max-h-[260px] overflow-y-auto custom-scrollbar"
            role="listbox"
          >
            <div className="px-2 py-1 text-[9px] font-mono font-black tracking-wider text-zinc-600 uppercase">Switch Workspace</div>
            {workspaces.map((ws) => (
              <button
                key={ws.name}
                type="button"
                role="option"
                aria-selected={ws.name === selectedWorkspace}
                onClick={() => handleSelectionCycle(ws.name)}
                className={cn(
                  "w-full rounded-lg px-2 py-1.5 flex items-center justify-between text-left text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-all outline-none",
                  ws.name === selectedWorkspace && "bg-zinc-900 text-zinc-100"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-5 w-5 rounded bg-zinc-900 border border-zinc-800/80 flex items-center justify-center font-mono text-[9px] font-bold text-zinc-500 uppercase">
                    {ws.name.split(" ")[1]?.[0]}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{ws.name}</span>
                    <span className="text-[9px] text-zinc-600 font-sans mt-0.5">Volumetric Usage Cap: {ws.usage}</span>
                  </div>
                </div>
                <span className="text-[8px] font-mono font-bold tracking-tight px-1 py-0.2 rounded bg-zinc-950 border border-zinc-900 text-zinc-500 uppercase">
                  {ws.badge}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// SIDEBAR ELEMENT MODULE: COMPOSABLE NAV GROUPS NAVIGATION RENDERER
// ============================================================================

export const SidebarNavigation: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <nav
      className={cn("flex-1 overflow-y-auto custom-scrollbar px-3 py-2 flex flex-col gap-4 select-none w-full", className)}
      {...props}
    >
      {children}
    </nav>
  );
};

export interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  rolesRequired?: SidebarRoleType[];
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({ label, rolesRequired, className, children, ...props }) => {
  const { isCollapsed, activeRole } = useSidebarContext();

  // Enforce rigid Role-Based Access Control Filtering parameters directly inside standard collection layout vectors
  if (rolesRequired && !rolesRequired.includes(activeRole)) return null;

  return (
    <div className={cn("flex flex-col gap-0.5 w-full", className)} {...props}>
      {label && !isCollapsed && (
        <span className="px-2.5 mb-1 text-[9px] font-mono font-black tracking-widest text-zinc-600 uppercase block select-none">
          {label}
        </span>
      )}
      {children}
    </div>
  );
};

// Alias backing design pattern compliance map requirements framework
export const SidebarGroup = SidebarSection;

export interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  href?: string;
  badge?: string | number;
  active?: boolean;
  loading?: boolean;
  notificationCount?: number;
  statusIndicator?: "online" | "offline" | "processing" | "none";
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  href,
  badge,
  active,
  loading = false,
  notificationCount = 0,
  statusIndicator = "none",
  className,
  onClick,
  ...props
}) => {
  const { isCollapsed, setIsMobileOpen, telemetry } = useSidebarContext();
  const pathname = usePathname();
  
  // Auto fallback route operational state checking map engine parameter
  const isCurrentlyActive = active !== undefined ? active : (href ? pathname === href : false);

  const handleLinkExecutionIntercept = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (telemetry) dispatchSidebarTelemetry(telemetry, "navigation_click");
    setIsMobileOpen(false); // Clean drawer dismissal auto tracking pass
    if (onClick) onClick(e);
  };

  const itemContent = (
    <>
      <div className="flex items-center gap-2.5 min-w-0 relative">
        <div className={cn(
          "text-zinc-500 group-hover:text-zinc-200 transition-colors shrink-0 flex items-center justify-center h-4 w-4 relative",
          isCurrentlyActive && "text-zinc-100"
        )}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : icon}
          
          {/* Internal Status Indicator Node Element wrapper override bounds */}
          {statusIndicator !== "none" && isCollapsed && (
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-zinc-950",
              statusIndicator === "online" && "bg-emerald-500",
              statusIndicator === "processing" && "bg-blue-500 animate-pulse",
              statusIndicator === "offline" && "bg-zinc-600"
            )} />
          )}
        </div>
        {!isCollapsed && (
          <span className="truncate tracking-wide text-left leading-none mt-[1px]">{label}</span>
        )}
      </div>

      {!isCollapsed && (badge !== undefined || notificationCount > 0) && (
        <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
          {notificationCount > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-md shadow-rose-950/20 leading-none">
              {notificationCount}
            </span>
          )}
          {badge !== undefined && notificationCount === 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[9px] font-mono font-bold text-zinc-500 group-hover:text-zinc-300 leading-none">
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Icon-Only Collapsed Variant Badge / Notification indicator dot proxy fallback */}
      {isCollapsed && notificationCount > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-600 shadow-md ring-1 ring-zinc-950" />
      )}
    </>
  );

  const interactiveWrapperStyles = cn(
    "group w-full h-8 rounded-lg px-2.5 flex items-center justify-between text-xs font-medium text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 transition-all outline-none relative select-none",
    isCurrentlyActive && "bg-zinc-900 text-zinc-100 font-bold border border-zinc-800/40 shadow-inner",
    isCollapsed && "justify-center p-0 h-9 w-9 mx-auto",
    loading && "opacity-50 pointer-events-none",
    className
  );

  if (href) {
    return (
      <button key={label} type="button" className={interactiveWrapperStyles} onClick={handleLinkExecutionIntercept} {...props} asChild={undefined}>
        <Link href={href} className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {itemContent}
        </Link>
      </button>
    );
  }

  return (
    <button type="button" onClick={handleLinkExecutionIntercept} className={interactiveWrapperStyles} title={isCollapsed ? label : undefined} {...props}>
      {itemContent}
    </button>
  );
};

// ============================================================================
// SIDEBAR ELEMENT MODULE: GLOBAL FOOTER OPERATIONAL TOGGLE
// ============================================================================

export const SidebarFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "border-t border-zinc-900/60 p-3 bg-[#030304]/60 flex flex-col gap-2 shrink-0 select-none z-20 w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const SidebarCollapseButton: React.FC = () => {
  const { isCollapsed, setIsCollapsed } = useSidebarContext();

  return (
    <button
      type="button"
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="w-full h-8 rounded-lg bg-zinc-950/40 border border-zinc-900/60 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all flex items-center justify-center outline-none"
      title={isCollapsed ? "Expand Frame Controller Panels (⌘B)" : "Collapse Frame Sidebar (⌘B)"}
    >
      {isCollapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
    </button>
  );
};

// ============================================================================
// SIDEBAR ELEMENT MODULE: PREMIUM IDENTITY END-POINT COMPONENT
// ============================================================================

export interface SidebarUserProfileProps extends React.HTMLAttributes<HTMLDivElement> {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export const SidebarUserProfile: React.FC<SidebarUserProfileProps> = ({ user, className, ...props }) => {
  const { isCollapsed, activeRole, selectedWorkspace } = useSidebarContext();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideInteraction = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideInteraction);
    return () => document.removeEventListener("mousedown", handleOutsideInteraction);
  }, [menuOpen]);

  return (
    <div ref={containerRef} className={cn("relative w-full z-40 select-none", className)} {...props}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          "w-full rounded-xl border border-zinc-900 bg-zinc-950 p-2 flex items-center gap-2.5 text-left hover:border-zinc-800 transition-all outline-none",
          isCollapsed && "p-1.5 justify-center"
        )}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-md shadow-indigo-950/20">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover rounded-full" />
          ) : (
            user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
          )}
        </div>
        
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-zinc-200 truncate leading-tight">{user.name}</span>
            <span className="text-[10px] font-mono text-zinc-500 truncate mt-0.5 leading-none">{user.email}</span>
          </div>
        )}
        
        {!isCollapsed && <ChevronsLeftRight className="h-3.5 w-3.5 text-zinc-600 shrink-0 rotate-90" />}
      </button>

      {/* Micro-Context Navigation Dropdown Panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute border border-zinc-900 bg-zinc-950 p-1.5 shadow-2xl rounded-xl flex flex-col gap-0.5 min-w-[200px] z-50",
              isCollapsed ? "left-[110%] bottom-0 ml-2 origin-left" : "left-0 right-0 bottom-[110%] mb-1.5 origin-bottom"
            )}
            role="menu"
          >
            <div className="px-2.5 py-2 border-b border-zinc-900/60 mb-1 flex flex-col">
              <span className="text-[10px] font-sans font-medium text-zinc-500 uppercase leading-none">Signed in as</span>
              <span className="text-xs font-bold text-zinc-200 truncate mt-1">{user.name}</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[9px] font-mono font-black uppercase bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-1.5 py-0.2">
                  {activeRole}
                </span>
                <span className="text-[8px] font-mono text-zinc-600 truncate max-w-[100px]">{selectedWorkspace}</span>
              </div>
            </div>

            <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-1.5 flex items-center gap-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-all outline-none">
              <User className="h-3.5 w-3.5 text-zinc-500" />
              <span>Profile Parameters</span>
            </button>
            <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-1.5 flex items-center gap-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-all outline-none">
              <Settings className="h-3.5 w-3.5 text-zinc-500" />
              <span>Global Preferences</span>
            </button>
            <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-1.5 flex items-center gap-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-all outline-none">
              <Bell className="h-3.5 w-3.5 text-zinc-500" />
              <span>Alert Routing Channels</span>
            </button>
            <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-1.5 flex items-center gap-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-all outline-none">
              <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
              <span>Billing Cycles</span>
            </button>

            <div className="h-px bg-zinc-900/80 my-1 -mx-1.5" />

            <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-1.5 flex items-center gap-2 text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-200 transition-all outline-none">
              <LogOut className="h-3.5 w-3.5 opacity-80" />
              <span>Terminate Session</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// CONSOLIDATED DEFAULT COMPOSABLE OUTLET COMPONENT EXAMPLE HOOK PROXY
// ============================================================================

export interface CompleteProductionSidebarProps extends SidebarProps {
  user: SidebarUserProfileProps["user"];
}

export const CompleteProductionSidebar: React.FC<CompleteProductionSidebarProps> = ({ user, activeRole = "Admin", ...props }) => {
  return (
    <Sidebar activeRole={activeRole} {...props}>
      <SidebarHeader />
      <SidebarSearch />
      <SidebarWorkspaceSwitcher />
      
      <SidebarNavigation>
        <SidebarSection label="Operational Control">
          <SidebarItem icon={<Layers className="h-4 w-4" />} label="Dashboard Hub" href="/dashboard" active />
          <SidebarItem icon={<Bot className="h-4 w-4" />} label="AI Agents Engine" href="/agents" badge="12" statusIndicator="online" />
          <SidebarItem icon={<Terminal className="h-4 w-4" />} label="Interactive Shell" href="/chat" notificationCount={4} />
        </SidebarSection>

        <SidebarSection label="Knowledge Architecture">
          <SidebarItem icon={<Database className="h-4 w-4" />} label="Vector Corpora" href="/knowledge" badge="v2" />
          <SidebarItem icon={<Blocks className="h-4 w-4" />} label="Workflow Networks" href="/workflows" statusIndicator="processing" />
          <SidebarItem icon={<Layers className="h-4 w-4" />} label="Integrations Mesh" href="/integrations" />
        </SidebarSection>

        <SidebarSection label="Platform Intelligence" rolesRequired={["Admin", "Manager", "Analyst"]}>
          <SidebarItem icon={<BarChart3 className="h-4 w-4" />} label="Metric Streams" href="/analytics" />
          <SidebarItem icon={<CreditCard className="h-4 w-4" />} label="Billing Engines" href="/billing" />
          <SidebarItem icon={<Settings className="h-4 w-4" />} label="System Settings" href="/settings" />
        </SidebarSection>

        <SidebarSection label="Governance Core" rolesRequired={["Admin"]}>
          <SidebarItem icon={<ShieldCheck className="h-4 w-4" />} label="IAM Access Control" href="/admin" badge="RBAC" />
        </SidebarSection>
      </SidebarNavigation>

      <SidebarFooter>
        <SidebarItem icon={<HelpCircle className="h-4 w-4" />} label="Documentation" href="/docs" />
        <SidebarCollapseButton />
        <SidebarUserProfile user={user} />
      </SidebarFooter>
    </Sidebar>
  );
};