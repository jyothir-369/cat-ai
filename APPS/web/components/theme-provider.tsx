"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

// ============================================================================
// TYPE ARCHITECTURE & INTERFACES (Future-Proofed for Marketplaces & Brand Kits)
// ============================================================================

export type CoreTheme = "light" | "dark" | "system";

export type FutureTheme = 
  | "midnight" 
  | "enterprise" 
  | "cyberpunk" 
  | "ai-command-center" 
  | "executive" 
  | "high-contrast";

export type Theme = CoreTheme | FutureTheme;

export interface DesignTokens {
  primary: string;
  secondary: string;
  surface: string;
  background: string;
  accent: string;
  radius: string;
  spacing: string;
  shadows: string;
}

export interface WorkspaceOverride {
  tenantId: string;
  isLocked: boolean;
  themeInheritance: boolean;
  customPalette?: Partial<DesignTokens>;
  customLogoUrl?: string;
  organizationPolicy?: "enforced-dark" | "enforced-light" | "unrestricted";
}

export interface ThemeTelemetryEvent {
  action: "load" | "change" | "restore" | "error";
  previousTheme?: Theme | string;
  currentTheme: Theme | string;
  timestamp: number;
  tenantId?: string;
  errorMessage?: string;
}

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: CoreTheme | undefined;
  forcedTheme: string | undefined;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
  tokens: DesignTokens;
  workspaceConfig: WorkspaceOverride | null;
  updateWorkspaceOverride: (config: WorkspaceOverride) => void;
  telemetryLog: ThemeTelemetryEvent[];
  isReducedMotion: boolean;
}

// ============================================================================
// SYSTEM STORAGE UTILITIES & GRACEFUL FALLBACK ENGINES
// ============================================================================

const STORAGE_KEY = "cat-ai-theme";

const INITIAL_TOKENS: DesignTokens = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  surface: "var(--surface)",
  background: "var(--background)",
  accent: "var(--accent)",
  radius: "var(--radius, 0.75rem)",
  spacing: "var(--spacing, 1rem)",
  shadows: "var(--shadows)",
};

const SUPPORTED_THEMES_ARRAY: Theme[] = [
  "light", "dark", "system", "midnight", "enterprise", 
  "cyberpunk", "ai-command-center", "executive", "high-contrast"
];

// High-speed telemetry reporting interface proxy
const reportThemeTelemetry = (event: ThemeTelemetryEvent) => {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.groupCollapsed(`[CAT AI THEME TELEMETRY]: ${event.action.toUpperCase()}`);
    console.log(`Current State: ${event.currentTheme}`);
    console.log(`Previous State: ${event.previousTheme ?? "N/A"}`);
    console.log(`Timestamp: ${event.timestamp}`);
    console.groupEnd();
  }
  // Hook external global tracking platform instances below (e.g., Datadog, Mixpanel)
};

// ============================================================================
// CORE CONTEXT DIRECTORY LAYER
// ============================================================================

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

// ============================================================================
// ENTERPRISE-GRADE THEME PROVIDER COMPONENT
// ============================================================================

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string | string[];
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  forcedTheme?: string;
}

/**
 * World-Class Enterprise Theme State Engine Component for Next.js App Router.
 * Features built-in orchestration systems handling multi-tenancy rules, cross-tab state syncing, 
 * CSS token transformations, layout-shift reductions, and precise telemetry reporting.
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  forcedTheme,
}: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = React.useState<boolean>(false);
  const [telemetryLog, setTelemetryLog] = React.useState<ThemeTelemetryEvent[]>([]);
  const [workspaceConfig, setWorkspaceConfig] = React.useState<WorkspaceOverride | null>(null);
  const [tokens, setTokens] = React.useState<DesignTokens>(INITIAL_TOKENS);

  // Initialize downstream standard values through high-efficiency hooks natively
  const nextThemeValues = useNextTheme();

  // Internal log capture agent
  const logEvent = React.useCallback((event: ThemeTelemetryEvent) => {
    setTelemetryLog((prev) => [event, ...prev.slice(0, 99)]);
    reportThemeTelemetry(event);
  }, []);

  // Structural Mounting Sequence Interface Layer
  React.useEffect(() => {
    setMounted(true);
    
    // Evaluate reduced-motion settings inside browser agent
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(motionQuery.matches);
    const handleMotionChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    motionQuery.addEventListener("change", handleMotionChange);

    // Initial Restoration Telemetry Event Dispatch Tracker Pass
    let parsedSavedTheme: Theme = (nextThemeValues.theme as Theme) || "system";
    try {
      const rawStored = window.localStorage.getItem(STORAGE_KEY);
      if (rawStored && SUPPORTED_THEMES_ARRAY.includes(rawStored as Theme)) {
        parsedSavedTheme = rawStored as Theme;
      }
    } catch (e) {
      logEvent({
        action: "error",
        currentTheme: defaultTheme,
        timestamp: Date.now(),
        errorMessage: "Missing localStorage context scope or corrupted value format read.",
      });
    }

    logEvent({
      action: "restore",
      currentTheme: parsedSavedTheme,
      timestamp: Date.now(),
    });

    // Cross-Tab System Mirror Ingress Synchronization Agent Logic
    const handleStorageSynchronization = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const nextTargetValue = (event.newValue as Theme) || "system";
        if (SUPPORTED_THEMES_ARRAY.includes(nextTargetValue)) {
          nextThemeValues.setTheme(nextTargetValue);
          logEvent({
            action: "change",
            previousTheme: (event.oldValue as Theme) || undefined,
            currentTheme: nextTargetValue,
            timestamp: Date.now(),
          });
        }
      }
    };
    window.addEventListener("storage", handleStorageSynchronization);

    return () => {
      motionQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("storage", handleStorageSynchronization);
    };
  }, [nextThemeValues.theme, logEvent, defaultTheme]);

  // Handle CSS variable adjustments for future design token palettes dynamically
  React.useEffect(() => {
    if (!mounted) return;
    
    const rootElement = window.document.documentElement;
    // Remove future extended parameters across boundaries smoothly
    SUPPORTED_THEMES_ARRAY.forEach((t) => {
      if (t !== "light" && t !== "dark" && t !== "system") {
        rootElement.removeAttribute(`data-theme-${t}`);
      }
    });

    const activeTheme = nextThemeValues.theme as Theme;
    
    // Inject specialized data-attributes if complex custom design matrix themes are invoked
    if (activeTheme && !["light", "dark", "system"].includes(activeTheme)) {
      rootElement.setAttribute("data-theme-variant", activeTheme);
      // Enforce modern enterprise base fallback configurations internally
      nextThemeValues.setTheme("dark"); 
    } else {
      rootElement.removeAttribute("data-theme-variant");
    }
  }, [nextThemeValues.theme, mounted]);

  // Tenant Modification Vector Transformation Wrapper Mapping
  const updateWorkspaceOverride = React.useCallback((config: WorkspaceOverride) => {
    if (config.isLocked) {
      // Admin policy takes precedence over standard configurations immediately
      if (config.organizationPolicy === "enforced-dark") nextThemeValues.setTheme("dark");
      if (config.organizationPolicy === "enforced-light") nextThemeValues.setTheme("light");
    }
    
    setWorkspaceConfig(config);

    if (config.customPalette) {
      setTokens((prev) => ({ ...prev, ...config.customPalette }));
      // Map token modifications onto runtime memory matrices gracefully
      const root = window.document.documentElement;
      Object.entries(config.customPalette).forEach(([tokenKey, value]) => {
        if (value) root.style.setProperty(`--theme-tokens-${tokenKey}`, value);
      });
    }
  }, [nextThemeValues]);

  // Memoize state updates to avoid unnecessary rendering across child elements
  const contextValue = React.useMemo<ThemeContextType>(() => {
    return {
      theme: (nextThemeValues.theme as Theme) || "system",
      resolvedTheme: nextThemeValues.resolvedTheme as CoreTheme | undefined,
      forcedTheme: forcedTheme || nextThemeValues.forcedTheme,
      setTheme: (newTheme: Theme) => {
        if (workspaceConfig?.isLocked) {
          logEvent({
            action: "error",
            currentTheme: nextThemeValues.theme || "system",
            timestamp: Date.now(),
            errorMessage: "Workspace theme locking parameters currently enforced by root administrator profile policy overrides.",
          });
          return;
        }
        
        const previous = nextThemeValues.theme as Theme;
        nextThemeValues.setTheme(newTheme);
        try {
          window.localStorage.setItem(STORAGE_KEY, newTheme);
        } catch (err) {
          // Graceful degradation when dealing with isolated contexts
        }
        
        logEvent({
          action: "change",
          previousTheme: previous,
          currentTheme: newTheme,
          timestamp: Date.now(),
          tenantId: workspaceConfig?.tenantId,
        });
      },
      themes: SUPPORTED_THEMES_ARRAY,
      tokens,
      workspaceConfig,
      updateWorkspaceOverride,
      telemetryLog,
      isReducedMotion,
    };
  }, [nextThemeValues, forcedTheme, tokens, workspaceConfig, updateWorkspaceOverride, telemetryLog, isReducedMotion, logEvent]);

  // Prevent layout flicker or structural hydration anomalies by matching the pre-render matrix
  if (!mounted) {
    return <React.Fragment>{children}</React.Fragment>;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <NextThemesProvider
        attribute={attribute}
        defaultTheme={defaultTheme}
        enableSystem={enableSystem}
        disableTransitionOnChange={disableTransitionOnChange}
        forcedTheme={forcedTheme}
        value={{
          light: "light",
          dark: "dark",
          midnight: "dark",
          enterprise: "dark",
          cyberpunk: "dark",
          "ai-command-center": "dark",
          executive: "dark",
          "high-contrast": "dark"
        }}
      >
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  );
}

// ============================================================================
// SYSTEM HOOK INTEGRATION ENGINE & ABSTRACTED INTERFACES
// ============================================================================

/**
 * Access theme settings from anywhere inside the application layer.
 * Enforces strong type safety and matches strict enterprise analytics metrics.
 */
export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      "useTheme hook invoked outside the scope of a validated enterprise ThemeProvider perimeter mapping framework."
    );
  }
  return context;
}

export const ThemeTypes = {
  all: SUPPORTED_THEMES_ARRAY,
  core: ["light", "dark", "system"] as CoreTheme[],
  extended: ["midnight", "enterprise", "cyberpunk", "ai-command-center", "executive", "high-contrast"] as FutureTheme[],
};

export const ThemeUtilities = {
  isValidTheme: (themeName: string): themeName is Theme => SUPPORTED_THEMES_ARRAY.includes(themeName as Theme),
  getPersistedThemeDirect: (): Theme | null => {
    if (typeof window === "undefined") return null;
    const item = window.localStorage.getItem(STORAGE_KEY);
    return ThemeUtilities.isValidTheme(item ?? "") ? (item as Theme) : null;
  }
};