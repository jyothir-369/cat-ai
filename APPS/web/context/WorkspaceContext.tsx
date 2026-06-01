"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";

// ── Type Definitions & Interfaces ───────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  clearWorkspace: () => void;
}

export interface WorkspaceProviderProps {
  children: ReactNode;
}

const STORAGE_KEYS = {
  ACTIVE_WORKSPACE_ID: "cat_ai_active_workspace_id",
} as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── Context Declaration ──────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

// ── Provider Component Implementation ────────────────────────────────────────

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { user, isAuthenticated, refreshSession } = useAuth();
  
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to extract token directly from local storage boundaries
  const getAccessToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("cat_ai_access_token");
  };

  // ── Core Action: Clear Workspace State ─────────────────────────────────────
  const clearWorkspace = useCallback((): void => {
    setCurrentWorkspace(null);
    setWorkspaces([]);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID);
    }
  }, []);

  // ── Core Action: Fetch and Refresh Workspace Configurations ────────────────
  const refreshWorkspace = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user) {
      clearWorkspace();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Missing active authentication session headers.");
      }

      // Determine target workspace tracking ID: priority given to localStorage persistence fallback
      let targetWorkspaceId = typeof window !== "undefined" 
        ? localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID) 
        : null;

      if (!targetWorkspaceId && user.workspace_id) {
        targetWorkspaceId = user.workspace_id;
      }

      // Fetch all tenant structures allocated to the active profile configuration
      const listResponse = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!listResponse.ok) {
        if (listResponse.status === 401 || listResponse.status === 403) {
          throw new Error("Access privileges revoked or token parameters stale.");
        }
        throw new Error(`Failed to list workspaces. Status: ${listResponse.status}`);
      }

      const fetchedWorkspaces: Workspace[] = await listResponse.json();
      setWorkspaces(fetchedWorkspaces);

      if (fetchedWorkspaces.length === 0) {
        setCurrentWorkspace(null);
        throw new Error("No active corporate workspace isolation sectors configured.");
      }

      // Determine final active workspace context
      let activeMatch = fetchedWorkspaces.find((w) => w.id === targetWorkspaceId);
      if (!activeMatch) {
        activeMatch = fetchedWorkspaces.find((w) => w.id === user.workspace_id) || fetchedWorkspaces[0];
      }

      // Fetch granular detailed metadata boundaries matching targeted current space context
      const detailResponse = await fetch(`${API_BASE_URL}/api/v1/workspaces/current?workspace_id=${activeMatch.id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (detailResponse.status === 404) {
        throw new Error("Target multi-tenant configuration boundary not found.");
      }

      if (!detailResponse.ok) {
        throw new Error(`Failed workspace configuration hydration. Status: ${detailResponse.status}`);
      }

      const currentWorkspaceData: Workspace = await detailResponse.json();
      
      setCurrentWorkspace(currentWorkspaceData);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, currentWorkspaceData.id);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Transient network failure detected.";
      setError(errorMessage);
      console.error("[WorkspaceEngine:SyncFailure]", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, clearWorkspace]);

  // ── Core Action: Switch Active Workspace ───────────────────────────────────
  const switchWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error("Authentication token signature mapping undetected.");

      // Post intent context update pass down to cluster route network
      const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/switch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (response.status === 403) {
        throw new Error("Permission denied: Identity context rejected from destination boundary cluster.");
      }

      if (!response.ok) {
        throw new Error(`Workspace switch handshake failed with status: ${response.status}`);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKSPACE_ID, workspaceId);
      }

      // Force internal microservice session ticket generation swap
      await refreshSession();
      await refreshWorkspace();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to cycle tenant spaces safely.";
      setError(errorMessage);
      console.error("[WorkspaceEngine:SwitchFailure]", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshSession, refreshWorkspace]);

  // ── Lifecycle Orchestration Hook Loops ─────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      refreshWorkspace();
    } else {
      clearWorkspace();
    }
  }, [isAuthenticated, user?.workspace_id, refreshWorkspace, clearWorkspace]);

  // Listen for Cross-Tab Workspace Updates
  useEffect(() => {
    const handleCrossTabSync = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEYS.ACTIVE_WORKSPACE_ID && event.newValue) {
        refreshWorkspace();
      }
    };

    window.addEventListener("storage", handleCrossTabSync);
    return () => {
      window.removeEventListener("storage", handleCrossTabSync);
    };
  }, [refreshWorkspace]);

  // Memoize Context value to optimize rendering behavior
  const memoizedContextPayload = useMemo<WorkspaceContextType>(() => {
    return {
      currentWorkspace,
      workspaces,
      loading,
      error,
      switchWorkspace,
      refreshWorkspace,
      clearWorkspace,
    };
  }, [currentWorkspace, workspaces, loading, error, switchWorkspace, refreshWorkspace, clearWorkspace]);

  return (
    <WorkspaceContext.Provider value={memoizedContextPayload}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ── Custom Consumption Hook Interceptor ──────────────────────────────────────

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  
  if (!context) {
    throw new Error(
      "useWorkspace execution violation: Consumer handles must be wrapped within an operational WorkspaceProvider layer topology."
    );
  }
  
  return context;
}