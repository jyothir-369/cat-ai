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

// ── 1. Component Interfaces & Types ──────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  permissions: string[];
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

// Storage key constants using strict single source of truth configurations
const STORAGE_KEYS = {
  ACCESS_TOKEN: "cat_ai_access_token",
  REFRESH_TOKEN: "cat_ai_refresh_token",
} as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ── 2. Isolation Storage Utility Helpers ─────────────────────────────────────

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

export const setAccessToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }
};

export const removeAccessToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const setRefreshToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }
};

export const removeRefreshToken = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
};

// ── 3. Auth Context Definition ───────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── 4. Auth Provider Component ───────────────────────────────────────────────

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Guard reference pointer to resolve background refresh race conditions
  const refreshPromiseRef = useMemo<{ current: Promise<void> | null }>(() => ({ current: null }), []);

  // Computed state property determining authorization clearance
  const isAuthenticated = useMemo(() => user !== null, [user]);

  // Unified memory cleanup wrapper executing cross-storage cache invalidation
  const clearSessionStorageAndCache = useCallback((): void => {
    removeAccessToken();
    removeRefreshToken();
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  // Structural parsing engine retrieving standard profile context data structures
  const fetchUserProfile = useCallback(async (token: string): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("HTTP_401: Expired or invalid security credentials token footprint.");
        }
        if (response.status === 403) {
          throw new Error("HTTP_403: Forbidden access privilege level configuration profile.");
        }
        if (response.status === 404) {
          throw new Error("HTTP_404: Authenticated tracking identifier profile segment matching targets not found.");
        }
        if (response.status >= 500) {
          throw new Error(`HTTP_500: Server workspace data mapping sync failure. Status: ${response.status}`);
        }
        throw new Error(`Core profile resolution mismatch status flag: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Network communication configuration anomaly handled during profile fetch.");
    }
  }, []);

  // ── Action: Refresh Session ────────────────────────────────────────────────
  const refreshSession = useCallback(async (): Promise<void> => {
    // If an in-flight token lease rotation sequence is currently executing, attach to it directly
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      clearSessionStorageAndCache();
      setUser(null);
      throw new Error("Session refresh execution rejected: No token configuration cached.");
    }

    const executeRefreshRequest = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });

        if (!response.ok) {
          throw new Error(`Security verification failed during token lease assignment cycle. Status: ${response.status}`);
        }

        const data: RefreshResponse = await response.json();
        if (!data.access_token) {
          throw new Error("Malformed JWT authentication contract mapping payload.");
        }

        setAccessToken(data.access_token);
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token);
        }
      } catch (error) {
        clearSessionStorageAndCache();
        setUser(null);
        console.error("[AuthEngine:LifecycleRotationException]", error);
        throw error;
      } finally {
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = executeRefreshRequest();
    return refreshPromiseRef.current;
  }, [clearSessionStorageAndCache, refreshPromiseRef]);

  // ── Action: Login ──────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: Record<string, unknown>): Promise<User> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("HTTP_401: Invalid cryptographic profile signature combination.");
        }
        if (response.status === 403) {
          throw new Error("HTTP_403: Security perimeter clearance denied matching identity parameters.");
        }
        if (response.status === 404) {
          throw new Error("HTTP_404: Authentication gateway route descriptor context endpoint not found.");
        }
        if (response.status >= 500) {
          throw new Error(`HTTP_500: System authentication module tracking crash. Status: ${response.status}`);
        }
        throw new Error(`Authentication server connection failed with status code ${response.status}`);
      }

      const data: LoginPayload = await response.json();
      if (!data.access_token || !data.refresh_token) {
        throw new Error("Server response verification error: Token structure missing.");
      }

      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token);

      const verifiedUser = data.user || (await fetchUserProfile(data.access_token));
      setUser(verifiedUser);
      return verifiedUser;
    } catch (error) {
      clearSessionStorageAndCache();
      setUser(null);
      console.error("[AuthEngine:HandshakeAborted]", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, clearSessionStorageAndCache]);

  // ── Action: Logout ─────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const currentRefreshToken = getRefreshToken();
      if (currentRefreshToken) {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });
      }
    } catch (error) {
      console.warn("[AuthEngine:ServerHandshakeWarning] Session dropped from client interface asynchronously.", error);
    } finally {
      clearSessionStorageAndCache();
      setUser(null);
      setLoading(false);
    }
  }, [clearSessionStorageAndCache]);

  // ── Action: Restore Session ────────────────────────────────────────────────
  const restoreSession = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const savedAccessToken = getAccessToken();
    const savedRefreshToken = getRefreshToken();

    if (!savedAccessToken || !savedRefreshToken) {
      clearSessionStorageAndCache();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await fetchUserProfile(savedAccessToken);
      setUser(profile);
    } catch (primaryError) {
      console.warn("[AuthEngine:AccessTokenStale] Attempting background rotation fallback sequence thread.");
      try {
        await refreshSession();
        const activeToken = getAccessToken();
        if (!activeToken) throw new Error("Verification token mapping missing after lifecycle sync.");
        const resolvedProfile = await fetchUserProfile(activeToken);
        setUser(resolvedProfile);
      } catch (secondaryError) {
        console.error("[AuthEngine:PersistentClearanceFailure] Active environment profiles scrubbed.");
        clearSessionStorageAndCache();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, refreshSession, clearSessionStorageAndCache]);

  // ── Action: Update User ────────────────────────────────────────────────────
  const updateUser = useCallback((userData: Partial<User>): void => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      return {
        ...prevUser,
        ...userData,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  // ── 5. Lifecycle Orchestration Hooks ───────────────────────────────────────
  
  // Single instantiation hook tracing environment bootstrap on launch
  useEffect(() => {
    let contextActive = true;
    if (contextActive) {
      restoreSession();
    }
    return () => {
      contextActive = false;
    };
  }, [restoreSession]);

  // Cross-Tab session clearing synchronizer listening to storage lifecycle sweeps
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncCrossTabLogout = (event: StorageEvent): void => {
      if (event.key === STORAGE_KEYS.REFRESH_TOKEN && !event.newValue) {
        setUser(null);
      }
    };

    window.addEventListener("storage", syncCrossTabLogout);
    return () => {
      window.removeEventListener("storage", syncCrossTabLogout);
    };
  }, []);

  // ── 6. Value Memoization Configuration ─────────────────────────────────────
  const contextValuePayload = useMemo<AuthContextType>(() => {
    return {
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      refreshSession,
      restoreSession,
      updateUser,
    };
  }, [
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshSession,
    restoreSession,
    updateUser,
  ]);

  return (
    <AuthContext.Provider value={contextValuePayload}>
      {children}
    </AuthContext.Provider>
  );
}

// ── 7. Custom Interception Consumption Hook ──────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}