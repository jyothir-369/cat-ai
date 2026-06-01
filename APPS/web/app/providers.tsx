"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as Sentry from "@sentry/nextjs";
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from "react-error-boundary";

// ── Required Structural Framework Imports ────────────────────────────────────
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/context/WorkspaceContext"; 
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

// ── Custom Telemetry Contracts ───────────────────────────────────────────────
interface TelemetryMetricPayload {
  eventName: string;
  duration?: number;
  status: "success" | "error" | "init";
  [key: string]: unknown;
}

interface CustomHttpError extends Error {
  status?: number;
  statusCode?: number;
}

const captureCustomMetric = (payload: TelemetryMetricPayload): void => {
  const metricLog = `[Telemetry:PlatformProviders] ${payload.eventName} - Status: ${payload.status}`;
  if (payload.status === "error") {
    console.error(metricLog, payload);
  } else {
    console.log(metricLog, payload);
  }
};

// ── Global Error Fallback UI Component ───────────────────────────────────────
function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  React.useEffect(() => {
    Sentry.captureException(error, { tags: { component: "GlobalProvidersErrorBoundary" } });
    captureCustomMetric({ eventName: "provider_crash_event", status: "error", message: error?.message });
  }, [error]);

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6 text-center"
    >
      <div className="max-w-md space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-lg">
        <h2 className="text-xl font-bold text-destructive">Platform Runtime Exception</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected initialization boundary crash occurred inside the core application pipeline. 
          Your session parameters remain isolated and secure.
        </p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-left text-xs font-mono text-foreground max-h-36">
          {error?.message || "Unknown Provider Error"}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Recover Application Core
        </button>
      </div>
    </div>
  );
}

// ── Enterprise TanStack Query Cache Strategies Configuration ───────────────────
const createQueryClient = () => {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.silent) return;
        Sentry.captureException(error, { extra: { queryKey: query.queryKey } });
        captureCustomMetric({ eventName: "query_error", status: "error", key: JSON.stringify(query.queryKey) });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, _context, mutation) => {
        if (mutation.meta?.silent) return;
        Sentry.captureException(error, { extra: { variables } });
        captureCustomMetric({ eventName: "mutation_error", status: "error" });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 Seconds standard cache validity
        gcTime: 1000 * 60 * 5,  // 5 Minutes garbage collection window
        refetchOnWindowFocus: false,
        refetchOnReconnect: "always",
        retry: (failureCount, error: unknown) => {
          const httpError = error as CustomHttpError;
          const statusCode = httpError?.status ?? httpError?.statusCode;
          
          // Terminate standard exponential backoff retries on credential drops
          if (statusCode === 401 || statusCode === 403 || failureCount >= 3) {
            return false;
          }
          return true;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
      },
      mutations: {
        retry: 1,
        retryDelay: 1000,
      }
    },
  });
};

// ── Feature Flag & Context Providers ─────────────────────────────────────────
interface FeatureFlags {
  enableAIAgentWorkflows: boolean;
  enableRagIngestion: boolean;
  enableAdvancedAnalytics: boolean;
}

const FeatureFlagContext = React.createContext<FeatureFlags | undefined>(undefined);

export function useFeatureFlags() {
  const context = React.useContext(FeatureFlagContext);
  if (!context) throw new Error("useFeatureFlags must be coupled inside a FeatureFlagProvider framework matrix.");
  return context;
}

// ── Custom Dynamic Analytics Registry Provider ──────────────────────────────
function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    captureCustomMetric({ eventName: "telemetry_initialized", status: "init" });
  }, []);
  return <>{children}</>;
}

// ── Structural Modals Base Stack Registry ────────────────────────────────────
function ModalProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ── Session Orchestrator & Authentication Engine Bootstrap ───────────────────
function SessionRestorer({ children }: { children: React.ReactNode }) {
  const { restoreSession } = useAuth();
  const [restored, setRestored] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    const startTime = performance.now();

    restoreSession()
      .then(() => {
        if (isMounted) {
          captureCustomMetric({
            eventName: "session_restore_performance",
            duration: performance.now() - startTime,
            status: "success",
          });
        }
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { sequence: "bootstrap_auth" } });
      })
      .finally(() => {
        if (isMounted) setRestored(true);
      });

    return () => {
      isMounted = false;
    };
  }, [restoreSession]);

  if (!restored) {
    return (
      <div 
        className="flex h-screen w-screen items-center justify-center bg-background"
        role="status"
        aria-label="Initializing secure environment authentication parameters..."
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Configuring CAT AI Security Engine...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Principal Providers Structural Architecture Compound Wrapper ───────────────
export function Providers({ children }: { children: React.ReactNode }) {
  // Prevent hydration mismatches using client-side initialization allocation parameters
  const [queryClient] = React.useState(() => createQueryClient());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Safe Server Component streaming layout fallback sequence
  if (!mounted) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    );
  }

  const activeFlags: FeatureFlags = {
    enableAIAgentWorkflows: true,
    enableRagIngestion: true,
    enableAdvancedAnalytics: process.env.NODE_ENV !== "production",
  };

  return (
    <ReactErrorBoundary 
      FallbackComponent={GlobalErrorFallback}
      onReset={() => {
        queryClient.clear();
        window.location.href = "/";
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionRestorer>
            <WorkspaceProvider>
              <FeatureFlagContext.Provider value={activeFlags}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                  <AnalyticsProvider>
                    <ModalProvider>
                      {children}
                      <Toaster />
                    </ModalProvider>
                  </AnalyticsProvider>
                </ThemeProvider>
              </FeatureFlagContext.Provider>
            </WorkspaceProvider>
          </SessionRestorer>
        </AuthProvider>

        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </QueryClientProvider>
    </ReactErrorBoundary>
  );
}