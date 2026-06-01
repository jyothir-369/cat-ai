"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// ENTERPRISE PROTOCOL INTERFACES & DOMAIN SCHEMAS
// ============================================================================

export type IntegrationCategory =
  | "All"
  | "Communication"
  | "Storage"
  | "CRM"
  | "Databases"
  | "Cloud Platforms"
  | "AI Providers"
  | "Productivity"
  | "Analytics"
  | "DevOps"
  | "Payments";

export type ConnectionStatus = "connected" | "disconnected" | "degraded" | "restricted";

export interface IntegrationApp {
  id: string;
  name: string;
  slug: string;
  category: IntegrationCategory;
  description: string;
  logoText: string;
  logoBg: string;
  status: ConnectionStatus;
  healthScore: number;
  lastSync: string;
  permissions: string[];
  authMethod: "OAuth 2.0" | "API Key" | "mTLS" | "Service Account";
  scopes: string[];
  owner: string;
  expiration: string | null;
  metrics: {
    volume24h: number;
    errorRate: number;
    latencyMs: number;
  };
}

export interface WebhookEndpoint {
  id: string;
  direction: "incoming" | "outgoing";
  targetUrl: string;
  connectedApp: string;
  status: "active" | "inactive" | "failing";
  failureCount: number;
  retryStrategy: string;
  recentLogs: {
    timestamp: string;
    payloadId: string;
    statusCode: number;
    latencyMs: number;
    delivery: "success" | "retry_exhausted" | "retrying";
  }[];
}

export interface VaultCredential {
  id: string;
  name: string;
  type: "API Key" | "OAuth Token" | "Service Account" | "X.509 Certificate";
  maskedValue: string;
  environment: "Production" | "Sandbox" | "Staging";
  lastRotated: string;
  rotationPolicy: string;
}

export interface SyncJob {
  id: string;
  appName: string;
  dataType: string;
  status: "synchronizing" | "completed" | "failed" | "pending";
  progressPercentage: number;
  recordsTransferred: number;
  startedAt: string;
}

// ============================================================================
// MONOLITHIC SIMULATED DATA DEPOSITORIES (STRIPE/ZAPIER GRADE)
// ============================================================================

const INITIAL_INTEGRATIONS: IntegrationApp[] = [
  {
    id: "app-slack",
    name: "Slack Enterprise Grid",
    slug: "slack",
    category: "Communication",
    description: "Stream kernel telemetry events, pipeline metrics, and high-fidelity AI agent conversational arrays into designated organizational channels.",
    logoText: "SL",
    logoBg: "bg-emerald-600",
    status: "connected",
    healthScore: 100,
    lastSync: "32s ago",
    permissions: ["channels:write", "chat:write", "bot", "incoming-webhook"],
    authMethod: "OAuth 2.0",
    scopes: ["identity.basic", "links:write", "team:read"],
    owner: "Raghava Node (SecOps Admin)",
    expiration: "Never (Refreshed via Grant)",
    metrics: { volume24h: 1420900, errorRate: 0.0001, latencyMs: 42 }
  },
  {
    id: "app-msteams",
    name: "Microsoft Teams TeamsHub",
    slug: "msteams",
    category: "Communication",
    description: "Publish deep adaptive cards and autonomous escalation triggers directly into tenant workspace graphs.",
    logoText: "MS",
    logoBg: "bg-blue-600",
    status: "connected",
    healthScore: 98,
    lastSync: "2m ago",
    permissions: ["Group.ReadWrite.All", "ChatMessage.Send"],
    authMethod: "OAuth 2.0",
    scopes: ["User.Read", "Directory.AccessAsUser.All"],
    owner: "IT Operations Cloud Root",
    expiration: "2026-12-31",
    metrics: { volume24h: 891200, errorRate: 0.0014, latencyMs: 68 }
  },
  {
    id: "app-gdrive",
    name: "Google Drive Enterprise Workspace",
    slug: "gdrive",
    category: "Storage",
    description: "Automated indexing, extraction, and chunk parsing of massive corporative unstructured document files into localized vector memories.",
    logoText: "GD",
    logoBg: "bg-amber-600",
    status: "connected",
    healthScore: 100,
    lastSync: "12m ago",
    permissions: ["drive.readonly", "metadata.readonly"],
    authMethod: "Service Account",
    scopes: ["domain-wide-delegation"],
    owner: "Data Engineering Root",
    expiration: "2027-04-15",
    metrics: { volume24h: 420500, errorRate: 0.0000, latencyMs: 124 }
  },
  {
    id: "app-dropbox",
    name: "Dropbox Business Infrastructure",
    slug: "dropbox",
    category: "Storage",
    description: "Sync large multi-format layout payloads directly down to background OCR pipeline workers.",
    logoText: "DB",
    logoBg: "bg-indigo-600",
    status: "disconnected",
    healthScore: 0,
    lastSync: "3d ago",
    permissions: ["files.metadata.read", "files.content.read"],
    authMethod: "OAuth 2.0",
    scopes: ["account_info.read"],
    owner: "Sarah Systems Architect",
    expiration: "Expired Token Bound",
    metrics: { volume24h: 0, errorRate: 1.0, latencyMs: 0 }
  },
  {
    id: "app-github",
    name: "GitHub Cloud Organizations Cluster",
    slug: "github",
    category: "DevOps",
    description: "Trigger autonomous agent micro-service compilation and repository actions straight from natural language command trees.",
    logoText: "GH",
    logoBg: "bg-zinc-800",
    status: "connected",
    healthScore: 100,
    lastSync: "Just now",
    permissions: ["repo", "workflow", "admin:org_hook"],
    authMethod: "OAuth 2.0",
    scopes: ["read:packages", "write:discussion"],
    owner: "CI-CD Cluster Pipeline Lead",
    expiration: "Never",
    metrics: { volume24h: 3120400, errorRate: 0.0002, latencyMs: 38 }
  },
  {
    id: "app-gitlab",
    name: "GitLab Ultimate Self-Hosted",
    slug: "gitlab",
    category: "DevOps",
    description: "Mirror repository structures for local enterprise token deployment checks and syntax standard enforcement algorithms.",
    logoText: "GL",
    logoBg: "bg-orange-600",
    status: "restricted",
    healthScore: 72,
    lastSync: "1h ago",
    permissions: ["api", "read_repository"],
    authMethod: "API Key",
    scopes: ["sudo-scope-unmapped"],
    owner: "SecOps Compliance Gate",
    expiration: "2026-08-01",
    metrics: { volume24h: 120400, errorRate: 0.045, latencyMs: 195 }
  },
  {
    id: "app-jira",
    name: "Jira Enterprise Cloud Platform",
    slug: "jira",
    category: "Productivity",
    description: "Dynamically generate tracking sprints tickets and link contextual stack dump reports dynamically via conversational outputs.",
    logoText: "JR",
    logoBg: "bg-blue-700",
    status: "connected",
    healthScore: 99,
    lastSync: "5m ago",
    permissions: ["read:jira-work", "write:jira-work"],
    authMethod: "OAuth 2.0",
    scopes: ["manage:jira-configuration"],
    owner: "Product Management Systems Node",
    expiration: "Never",
    metrics: { volume24h: 45100, errorRate: 0.0005, latencyMs: 92 }
  },
  {
    id: "app-notion",
    name: "Notion Team Workspace Wiki",
    slug: "notion",
    category: "Productivity",
    description: "Synchronize company procedure templates directly into the autonomous context awareness graphs.",
    logoText: "NT",
    logoBg: "bg-zinc-900",
    status: "connected",
    healthScore: 100,
    lastSync: "14m ago",
    permissions: ["read_content", "update_content"],
    authMethod: "API Key",
    scopes: ["internal_integration_token"],
    owner: "Operations Hub Root",
    expiration: "Never",
    metrics: { volume24h: 92400, errorRate: 0.0001, latencyMs: 54 }
  },
  {
    id: "app-hubspot",
    name: "HubSpot Global Marketing CRM",
    slug: "hubspot",
    category: "CRM",
    description: "Stream high-intent pipeline signals to model predictive evaluation engines dynamically.",
    logoText: "HS",
    logoBg: "bg-orange-500",
    status: "connected",
    healthScore: 96,
    lastSync: "4m ago",
    permissions: ["contacts", "deals", "timeline"],
    authMethod: "OAuth 2.0",
    scopes: ["crm.objects.contacts.read"],
    owner: "Growth Marketing Dev Lead",
    expiration: "2026-06-15",
    metrics: { volume24h: 341000, errorRate: 0.0021, latencyMs: 87 }
  },
  {
    id: "app-salesforce",
    name: "Salesforce Core Customer Graph",
    slug: "salesforce",
    category: "CRM",
    description: "The enterprise source-of-truth customer layer link. Handles live transactional state routing boundaries.",
    logoText: "SF",
    logoBg: "bg-cyan-600",
    status: "connected",
    healthScore: 100,
    lastSync: "11s ago",
    permissions: ["api", "refresh_token", "visualforce"],
    authMethod: "mTLS",
    scopes: ["full_access_domain_mesh"],
    owner: "VP Enterprise Architecture Team",
    expiration: "Never",
    metrics: { volume24h: 4210900, errorRate: 0.0000, latencyMs: 29 }
  },
  {
    id: "app-stripe",
    name: "Stripe Billing Infrastructure Layer",
    slug: "stripe",
    category: "Payments",
    description: "Track global payment anomalies, ARR changes, and subscription metrics arrays via secure direct endpoints.",
    logoText: "ST",
    logoBg: "bg-violet-600",
    status: "connected",
    healthScore: 100,
    lastSync: "25s ago",
    permissions: ["charges.read", "customers.read", "invoices.write"],
    authMethod: "API Key",
    scopes: ["restricted_key_scope_prod"],
    owner: "Finance Engineering Core Controller",
    expiration: "Never",
    metrics: { volume24h: 6810200, errorRate: 0.0000, latencyMs: 14 }
  },
  {
    id: "app-openai",
    name: "OpenAI Token Inference Gateway",
    slug: "openai",
    category: "AI Providers",
    description: "Primary deep reasoning array cluster for heavy macro analytics execution context bindings.",
    logoText: "OA",
    logoBg: "bg-teal-700",
    status: "connected",
    healthScore: 99,
    lastSync: "1s ago",
    permissions: ["all_models_inference", "fine_tuning_write"],
    authMethod: "API Key",
    scopes: ["org-admin-token-level"],
    owner: "AI Operating System Kernel Principal",
    expiration: "Never",
    metrics: { volume24h: 12420900, errorRate: 0.0008, latencyMs: 450 }
  },
  {
    id: "app-anthropic",
    name: "Anthropic Claude Matrix Services",
    slug: "anthropic",
    category: "AI Providers",
    description: "High-context document comprehension pipelines and agent recursive multi-signature code reviews.",
    logoText: "AN",
    logoBg: "bg-amber-800",
    status: "connected",
    healthScore: 100,
    lastSync: "4s ago",
    permissions: ["claude-3-5-sonnet", "claude-3-opus"],
    authMethod: "API Key",
    scopes: ["production-tier-unlimited"],
    owner: "AI Operating System Kernel Principal",
    expiration: "Never",
    metrics: { volume24h: 9145000, errorRate: 0.0002, latencyMs: 380 }
  },
  {
    id: "app-gemini",
    name: "Google Gemini Large Context Core",
    slug: "gemini",
    category: "AI Providers",
    description: "Massive context analytical evaluation matrices scaling beyond 2M sequence processing loops.",
    logoText: "GM",
    logoBg: "bg-blue-800",
    status: "connected",
    healthScore: 100,
    lastSync: "8s ago",
    permissions: ["gemini-1.5-pro-ultra"],
    authMethod: "API Key",
    scopes: ["enterprise-unmetered-allowance"],
    owner: "AI Operating System Kernel Principal",
    expiration: "Never",
    metrics: { volume24h: 5610200, errorRate: 0.0004, latencyMs: 290 }
  }
];

const INITIAL_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: "wh-01",
    direction: "incoming",
    targetUrl: "https://api.cat-ai.internal/v1/ingress/slack/events-stream",
    connectedApp: "Slack Enterprise Grid",
    status: "active",
    failureCount: 0,
    retryStrategy: "Exponential Backoff (Max 5)",
    recentLogs: [
      { timestamp: "10:05:42", payloadId: "pay-8941", statusCode: 200, latencyMs: 12, delivery: "success" },
      { timestamp: "10:05:11", payloadId: "pay-8939", statusCode: 200, latencyMs: 14, delivery: "success" },
      { timestamp: "10:04:30", payloadId: "pay-8932", statusCode: 200, latencyMs: 9, delivery: "success" }
    ]
  },
  {
    id: "wh-02",
    direction: "outgoing",
    targetUrl: "https://api.stripe.com/v1/webhook_endpoints/we_124912",
    connectedApp: "Stripe Billing Infrastructure Layer",
    status: "active",
    failureCount: 0,
    retryStrategy: "Linear Retry Matrix (Max 3)",
    recentLogs: [
      { timestamp: "10:04:01", payloadId: "pay-7711", statusCode: 201, latencyMs: 45, delivery: "success" },
      { timestamp: "10:01:15", payloadId: "pay-7690", statusCode: 200, latencyMs: 38, delivery: "success" }
    ]
  },
  {
    id: "wh-03",
    direction: "incoming",
    targetUrl: "https://api.cat-ai.internal/v1/ingress/dropbox/sync-trigger",
    connectedApp: "Dropbox Business Infrastructure",
    status: "failing",
    failureCount: 42,
    retryStrategy: "Circuit Breaker Tripped Block",
    recentLogs: [
      { timestamp: "09:12:00", payloadId: "pay-1102", statusCode: 401, latencyMs: 190, delivery: "retry_exhausted" },
      { timestamp: "09:10:15", payloadId: "pay-1099", statusCode: 401, latencyMs: 184, delivery: "retry_exhausted" }
    ]
  }
];

const INITIAL_VAULT: VaultCredential[] = [
  { id: "crd-01", name: "Production OpenAI Root Key Cluster", type: "API Key", maskedValue: "sk-proj-••••••••••••••••••••A9f4x", environment: "Production", lastRotated: "2d ago", rotationPolicy: "30-Day Automated Micro-Rotation" },
  { id: "crd-02", name: "Salesforce OAuth Token Core Binding", type: "OAuth Token", maskedValue: "oauth-tok-••••••••••••••••••••99x1z", environment: "Production", lastRotated: "14h ago", rotationPolicy: "Dynamic Refresh Token Lifetime Allocation" },
  { id: "crd-03", name: "Stripe Enterprise Restricted API Master", type: "API Key", maskedValue: "rk_live_••••••••••••••••••••Z44r2", environment: "Production", lastRotated: "28d ago", rotationPolicy: "Manual Verification Required Mandated" },
  { id: "crd-04", name: "Sandbox Testing Access Token Sandbox", type: "API Key", maskedValue: "sk_test_••••••••••••••••••••M11b7", environment: "Sandbox", lastRotated: "Just now", rotationPolicy: "Volatile Transient Storage Allocation" }
];

const INITIAL_SYNC_JOBS: SyncJob[] = [
  { id: "sync-101", appName: "Salesforce Core Customer Graph", dataType: "Account Records Array Matrix", status: "synchronizing", progressPercentage: 68, recordsTransferred: 142090, startedAt: "3m ago" },
  { id: "sync-102", appName: "Google Drive Enterprise Workspace", dataType: "Markdown Structural Knowledge Wikis", status: "completed", progressPercentage: 100, recordsTransferred: 4205, startedAt: "1h ago" },
  { id: "sync-103", appName: "Dropbox Business Infrastructure", dataType: "Vendor Agreements Contracts Assets", status: "failed", progressPercentage: 12, recordsTransferred: 410, startedAt: "3d ago" }
];

// ============================================================================
// MAIN PRODUCTION PLATFORM EXPERIMENTAL IMPLEMENTATION
// ============================================================================

export default function IntegrationsMarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [apps, setApps] = useState<IntegrationApp[]>(INITIAL_INTEGRATIONS);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(INITIAL_WEBHOOKS);
  const [vault, setVault] = useState<VaultCredential[]>(INITIAL_VAULT);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>(INITIAL_SYNC_JOBS);
  const [selectedApp, setSelectedApp] = useState<IntegrationApp | null>(INITIAL_INTEGRATIONS[0]);
  const [currentWorkspaceSection, setCurrentWorkspaceSection] = useState<"marketplace" | "gateways" | "vault" | "devhub">("marketplace");

  // Webhook Creation Form States
  const [newWhApp, setNewWhApp] = useState("Slack Enterprise Grid");
  const [newWhUrl, setNewWhUrl] = useState("");
  const [newWhDirection, setNewWhDirection] = useState<"incoming" | "outgoing">("incoming");

  // Filter and Optimize Application Virtual Matrix Selections
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchCat = selectedCategory === "All" || app.category === selectedCategory;
      const matchSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [apps, selectedCategory, searchQuery]);

  const handleCreateWebhookEndpoint = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhUrl.trim()) return;
    const newWebhook: WebhookEndpoint = {
      id: `wh-${Date.now()}`,
      direction: newWhDirection,
      targetUrl: newWhUrl,
      connectedApp: newWhApp,
      status: "active",
      failureCount: 0,
      retryStrategy: "Exponential Backoff Loop (Max 5)",
      recentLogs: [{ timestamp: "10:06:00", payloadId: `pay-${Math.floor(Math.random() * 9000)}`, statusCode: 200, latencyMs: 8, delivery: "success" }]
    };
    setWebhooks(prev => [newWebhook, ...prev]);
    setNewWhUrl("");
    alert("New production webhook topology ingress vector declared successfully.");
  }, [newWhApp, newWhUrl, newWhDirection]);

  const toggleConnectionState = (id: string) => {
    setApps(prev => prev.map(app => {
      if (app.id === id) {
        const targetStatus: ConnectionStatus = app.status === "connected" ? "disconnected" : "connected";
        const targetHealth = targetStatus === "connected" ? 100 : 0;
        const updated = { ...app, status: targetStatus, healthScore: targetHealth, lastSync: "Just now" };
        if (selectedApp?.id === id) setSelectedApp(updated);
        return updated;
      }
      return app;
    }));
  };

  const executeManualTokenRotationOverride = (id: string) => {
    setVault(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, lastRotated: "Just now", maskedValue: `${item.maskedValue.substring(0, 12)}••••••••RotatedKey${Math.floor(Math.random()*9)}x` };
      }
      return item;
    }));
    alert("Cryptographic hash boundary rotated successfully. Propagating context across cloud cluster arrays.");
  };

  return (
    <div className="min-h-screen w-full bg-[#070709] text-zinc-100 p-6 space-y-8 overflow-x-hidden selection:bg-violet-500/30 font-sans antialiased">
      
      {/* ============================================================================
          SECTION 1: INTEGRATIONS COMMAND CENTER HEADER CONTROL NODE
         ============================================================================ */}
      <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border-b border-zinc-800/60 pb-6 bg-zinc-950/20 p-5 rounded-2xl backdrop-blur-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse" />
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-500 bg-clip-text text-transparent">Ecosystem Connectors & API Gateways</h1>
          </div>
          <p className="text-xs font-mono text-zinc-500">CAT OS Core Kernel Gateway Routing Matrices • Access: <span className="text-zinc-300 font-bold">Global Domain Master</span></p>
          
          {/* Realtime Aggregated Performance Metrics Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-[11px] text-zinc-400">
            <span className="border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-0.5 rounded-md">Connected Clusters: <strong className="text-white">{apps.filter(a => a.status === "connected").length}</strong></span>
            <span className="border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-0.5 rounded-md">Endpoint Pipelines: <strong className="text-violet-400">{webhooks.length} Active</strong></span>
            <span className="border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-0.5 rounded-md">API Volume (24h): <strong className="text-emerald-400">42,912,402 reqs</strong></span>
            <span className="border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-0.5 rounded-md">Ecosystem Health Index: <strong className="text-[#0070f3]">99.98% Stable</strong></span>
            <span className="border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-0.5 rounded-md">Synchronized State Buffer: <strong className="text-amber-400">Synced</strong></span>
          </div>
        </div>

        {/* Action Management Dashboard Controls Panel */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
          <button onClick={() => alert("Initializing connection wizard sequence module...")} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-bold px-4 py-2 rounded-xl border border-zinc-700/40 shadow-xl active:scale-98 transition-all">
            ➕ Provision Application Cluster Link
          </button>
          <button onClick={() => { setCurrentWorkspaceSection("gateways"); setActiveTab("webhookConfig"); }} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-xl text-zinc-200 transition-colors">
            🔗 Create Ingress Webhook
          </button>
          <button onClick={() => setCurrentWorkspaceSection("vault")} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-2 rounded-xl text-zinc-200 transition-colors">
            🔑 Generate Authorization Token
          </button>
          <button onClick={() => alert("Streaming real-time global system proxy trace streams logs...")} className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-500 px-2.5 py-2 rounded-xl transition-colors">
            Logs Console →
          </button>
        </div>
      </header>

      {/* Primary Infrastructure Module Navigation Layer */}
      <nav className="flex items-center gap-2 border-b border-zinc-900 pb-1.5">
        {(["marketplace", "gateways", "vault", "devhub"] as const).map(section => (
          <button
            key={section}
            onClick={() => setCurrentWorkspaceSection(section)}
            className={`px-4 py-1.5 font-mono text-xs font-black uppercase tracking-widest rounded-lg transition-all focus:outline-none ${currentWorkspaceSection === section ? "bg-zinc-900 text-white border border-zinc-800/80 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {section === "marketplace" ? "🏛️ Connected Ecosystem Catalog" : section === "gateways" ? "📡 Webhooks & API Gateways" : section === "vault" ? "🔐 Cryptographic Credential Vault" : "🛠️ Developer Sandbox Hub"}
          </button>
        ))}
      </nav>

      {/* CORE WORKSPACE MANAGER CONDITIONALS ROUTER SWITCH */}
      {currentWorkspaceSection === "marketplace" && (
        <div className="space-y-6">

          {/* ============================================================================
              SECTION 2: INTEGRATION CATEGORIES MATRIX SCOPE SELECTION
             ============================================================================ */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 block">Section 2: Component Vertical Domain Classification Filtering</span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
              {(["All", "Communication", "Storage", "CRM", "Databases", "Cloud Platforms", "AI Providers", "Productivity", "DevOps", "Payments"] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg border transition-all text-[11px] font-bold ${selectedCategory === cat ? "bg-zinc-900 text-white border-zinc-700 shadow-inner" : "bg-zinc-950/40 text-zinc-500 border-transparent hover:text-zinc-300"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            {/* Realtime Filter Ingestion Text Input */}
            <div className="pt-2 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Query global ecosystem instances catalog (e.g. Stripe, Salesforce, OpenAI...)"
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-4 py-2 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* MAIN TWO-COLUMN EXPERIMENTAL INTERNET LANDSCAPE GRID LAYOUT VIEW */}
          <div className="grid gap-6 lg:grid-cols-4">

            {/* ============================================================================
                SECTION 3: INTEGRATION MARKETPLACE SYSTEM INSTANCES GRID CATALOG
               ============================================================================ */}
            <div className="lg:col-span-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-max">
              {filteredApps.map(app => {
                const isActiveConnection = app.status === "connected";
                const isTargetSelected = selectedApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 rounded-2xl border bg-zinc-950/20 backdrop-blur-md flex flex-col justify-between space-y-4 relative group cursor-pointer transition-all hover:scale-101 hover:bg-zinc-950/40 ${isTargetSelected ? "border-violet-500/80 ring-1 ring-violet-500/20" : "border-zinc-800/60"}`}
                  >
                    <div className="space-y-3">
                      {/* Logo and Status Badge Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-xl ${app.logoBg} flex items-center justify-center font-mono font-black text-xs text-white shadow-md`}>
                            {app.logoText}
                          </div>
                          <div>
                            <h3 className="font-sans font-bold text-zinc-200 text-sm group-hover:text-violet-400 transition-colors line-clamp-1">{app.name}</h3>
                            <span className="text-[9px] font-mono text-zinc-500 block uppercase tracking-tight">{app.category} Layer</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-black tracking-wider ${app.status === "connected" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : app.status === "restricted" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-900 text-zinc-500"}`}>
                          {app.status}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 font-sans line-clamp-3 leading-relaxed">{app.description}</p>
                    </div>

                    {/* Meta-analytics snapshot grid inside app card boundaries */}
                    <div className="border-t border-zinc-900/80 pt-3 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                      <div className="space-y-0.5">
                        <p>Sync Threshold: <span className="text-zinc-300 font-semibold">{app.lastSync}</span></p>
                        <p>Health Quotient: <span className={app.healthScore > 80 ? "text-emerald-400" : "text-rose-400"}>{app.healthScore}% Operational</span></p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 font-bold block truncate max-w-[110px]">{app.authMethod}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredApps.length === 0 && (
                <div className="p-8 border border-dashed border-zinc-800 rounded-2xl col-span-full text-center font-mono text-xs text-zinc-600">
                  No explicit ecosystem platform maps matching search constraints found in memory stack repository.
                </div>
              )}
            </div>

            {/* ============================================================================
                SECTION 4: CONNECTION DETAILS PANEL (CONTEXT-DEPENDENT DRILLDOWN)
               ============================================================================ */}
            <div className="border border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-4 font-mono space-y-5 h-fit shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2">Section 4: Node Context Drilldown Monitor</h3>
              
              {selectedApp ? (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-lg ${selectedApp.logoBg} flex items-center justify-center text-[10px] text-white font-bold`}>
                      {selectedApp.logoText}
                    </div>
                    <span className="text-zinc-200 font-bold text-sm font-sans">{selectedApp.name}</span>
                  </div>

                  <div className="space-y-1.5 bg-zinc-950/80 p-3 rounded-xl border border-zinc-900/60 text-[11px]">
                    <div className="flex justify-between"><span className="text-zinc-500">AUTH PARADIGM:</span><span className="text-zinc-300 font-bold">{selectedApp.authMethod}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">OWNING CLAIM:</span><span className="text-zinc-400 truncate max-w-[140px] font-sans font-medium">{selectedApp.owner}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">LEASE EXPIRE:</span><span className="text-zinc-400">{selectedApp.expiration || "Infinite allowance"}</span></div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">DECLARED SECURITY SCOPES ARRAY</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedApp.scopes.map(sc => (
                        <span key={sc} className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[10px]">{sc}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">PERMISSIONS CAPABILITIES MAPPING</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedApp.permissions.map(pm => (
                        <span key={pm} className="bg-zinc-900/40 text-violet-400 px-1.5 py-0.5 rounded text-[10px] border border-violet-950/40">{pm}</span>
                      ))}
                    </div>
                  </div>

                  {/* Operational Telemetry Metrics Inside Inspector View */}
                  <div className="border-t border-zinc-900 pt-3 space-y-2">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">TRAFFIC METRICS REALTIME TELEMETRY</span>
                    <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                      <div className="bg-zinc-900/20 p-1.5 border border-zinc-900 rounded">
                        <span className="text-zinc-600 text-[8px] block">VOL 24H</span>
                        <strong className="text-zinc-300">{(selectedApp.metrics.volume24h / 1000).toFixed(1)}k</strong>
                      </div>
                      <div className="bg-zinc-900/20 p-1.5 border border-zinc-900 rounded">
                        <span className="text-zinc-600 text-[8px] block">ERR RATE</span>
                        <strong className={selectedApp.metrics.errorRate > 0.02 ? "text-rose-400" : "text-emerald-400"}>{(selectedApp.metrics.errorRate * 100).toFixed(3)}%</strong>
                      </div>
                      <div className="bg-zinc-900/20 p-1.5 border border-zinc-900 rounded">
                        <span className="text-zinc-600 text-[8px] block">LATENCY</span>
                        <strong className="text-violet-400">{selectedApp.metrics.latencyMs}ms</strong>
                      </div>
                    </div>
                  </div>

                  {/* Global Toggle Administrative Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => toggleConnectionState(selectedApp.id)}
                      className={`w-full py-2 rounded-xl text-center font-bold font-mono transition-all border ${selectedApp.status === "connected" ? "bg-rose-950/30 border-rose-900 text-rose-400 hover:bg-rose-900/40" : "bg-gradient-to-r from-violet-600 to-indigo-600 border-zinc-800 text-white"}`}
                    >
                      {selectedApp.status === "connected" ? "⚠️ Terminate Connection Session" : "⚡ Initialize Connector Handshake"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 text-xs leading-relaxed">No explicit instance targeted. Target any app blueprint matrix item inside the marketplace listing grid module to view parameters analysis dumps maps instantly.</p>
              )}
            </div>

          </div>

          {/* ============================================================================
              SECTION 9: REALTIME DATA SYNCHRONIZATION MONITOR STACK
             ============================================================================ */}
          <section className="p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl font-mono text-xs space-y-4">
            <div className="border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 9: Core Kernel Data Synchronization Sync Matrix</h3>
              <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Live background replication pipeline arrays copying transaction records across decentralized cloud node systems storage endpoints.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {syncJobs.map(job => (
                <div key={job.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <strong className="text-zinc-200 truncate max-w-[160px] font-sans">{job.appName}</strong>
                      <span className={`px-1 rounded text-[9px] uppercase font-bold tracking-tight ${job.status === "synchronizing" ? "bg-blue-500/10 text-blue-400 animate-pulse" : job.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{job.status}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">{job.dataType}</p>
                  </div>

                  <div className="space-y-1.5">
                    {/* Linear CSS Ingress Bar Progress Indicators */}
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div style={{ width: `${job.progressPercentage}%` }} className={`h-full rounded-full ${job.status === "failed" ? "bg-rose-600" : job.status === "completed" ? "bg-emerald-500" : "bg-gradient-to-r from-violet-600 to-indigo-400"}`} />
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-600">
                      <span>Transferred: <strong className="text-zinc-400">{job.recordsTransferred.toLocaleString()} rows</strong></span>
                      <span>{job.progressPercentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}

      {/* ============================================================================
          SECTION 5 & 6: WEBHOOK MANAGEMENT ROUTING & API GATEWAYS TELEMETRY LOGS
         ============================================================================ */}
      {currentWorkspaceSection === "gateways" && (
        <div className="space-y-6">
          
          {/* Internal Local Submenu Tabs Bar */}
          <div className="grid gap-6 xl:grid-cols-3">
            
            {/* Live Webhook Declarative Engine Builder Panel Form */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 font-mono text-xs space-y-4 h-fit">
              <div className="border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 5: Provision Production Webhook Endpoint Ingress Vector</h3>
                <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Route external server actions payloads array parameters stream securely down into internal cluster boundaries logic grids.</p>
              </div>

              <form onSubmit={handleCreateWebhookEndpoint} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block uppercase">Target Connected Ecosystem Client</label>
                  <select
                    value={newWhApp}
                    onChange={(e) => setNewWhApp(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    {apps.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block uppercase">Directional Ingress Channel</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNewWhDirection("incoming")} className={`flex-1 py-1.5 rounded-lg border font-bold ${newWhDirection === "incoming" ? "bg-zinc-900 text-white border-zinc-700" : "bg-zinc-950 text-zinc-600 border-transparent"}`}>Incoming Streams</button>
                    <button type="button" onClick={() => setNewWhDirection("outgoing")} className={`flex-1 py-1.5 rounded-lg border font-bold ${newWhDirection === "outgoing" ? "bg-zinc-900 text-white border-zinc-700" : "bg-zinc-950 text-zinc-600 border-transparent"}`}>Outgoing Hooks</button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 block uppercase">Target Endpoint URL Destination Binding</label>
                  <input
                    type="text"
                    value={newWhUrl}
                    onChange={(e) => setNewWhUrl(e.target.value)}
                    placeholder="https://api.cat-ai.internal/v1/ingress/endpoint-mesh..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder-zinc-700"
                  />
                </div>

                <button type="submit" disabled={!newWhUrl.trim()} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-bold py-2 rounded-xl transition-all disabled:opacity-40">
                  ⚡ Declare Routing Vector Endpoint Link
                </button>
              </form>
            </div>

            {/* Active Endpoints Pipeline Ingress Matrix Registry */}
            <div className="xl:col-span-2 p-4 border border-zinc-800 bg-zinc-950/20 rounded-2xl font-mono text-xs space-y-4">
              <div className="border-b border-zinc-900 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Ecosystem Endpoint Stream Registry Matrices</h3>
              </div>

              <div className="space-y-3">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-3 bg-zinc-950 border border-zinc-900/80 rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${wh.direction === "incoming" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"}`}>{wh.direction}</span>
                        <strong className="text-zinc-200 font-sans">{wh.connectedApp}</strong>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${wh.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 animate-pulse"}`}>{wh.status}</span>
                    </div>

                    <p className="text-[11px] bg-zinc-900/60 p-2 rounded border border-zinc-900 font-mono text-zinc-400 select-all break-all">{wh.targetUrl}</p>

                    {/* Historical mini trace execution payload elements inside webhook wrapper */}
                    <div className="space-y-1">
                      <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-600 block">Recent Delivery Traces Delivery Streams</span>
                      <div className="grid gap-1">
                        {wh.recentLogs.map((log, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-zinc-950/40 px-2 py-1 rounded text-[10px] text-zinc-500 border border-zinc-900/40">
                            <span>Time: {log.timestamp} • Payload ID: <span className="text-zinc-400 font-bold">#{log.payloadId}</span></span>
                            <div className="flex items-center gap-2">
                              <span>Latency: <strong className="text-zinc-400">{log.latencyMs}ms</strong></span>
                              <span className={log.statusCode === 200 || log.statusCode === 201 ? "text-emerald-400" : "text-rose-400"}>HTTP {log.statusCode}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ============================================================================
              SECTION 6: API GATEWAY TELEMETRY DASHBOARD COUNTERS METRICS
             ============================================================================ */}
          <section className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-2xl font-mono text-xs space-y-4">
            <div className="border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 6: Cloud Proxy Edge API Gateway Realtime Diagnostics</h3>
              <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Live ingress bandwidth volume allocation, rate limitation limits indexes, and pipeline proxy anomalies traces pools.</p>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Agg Error Backlog Ratio</span>
                <p className="text-lg text-emerald-400 font-bold">0.0024%</p>
                <div className="text-[9px] text-zinc-600">Within historical limits boundaries</div>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Proxy Latency P99 Bound</span>
                <p className="text-lg text-violet-400 font-bold">14.2ms</p>
                <div className="text-[9px] text-zinc-600">Edge caching nodes hot hit optimization</div>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Active Rate Limiting Hits</span>
                <p className="text-lg text-zinc-300 font-bold">0 blocks/sec</p>
                <div className="text-[9px] text-zinc-600">No localized DDoS bursts flagged</div>
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Ingress Bandwidth Allocation</span>
                <p className="text-lg text-amber-400 font-bold">4.82 TB/hr</p>
                <div className="text-[9px] text-zinc-600">Continuous context chunk stream transfers</div>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ============================================================================
          SECTION 7 & 10: CRYPTOGRAPHIC VAULT ACCESS CREDENTIAL CONTROLS
         ============================================================================ */}
      {currentWorkspaceSection === "vault" && (
        <div className="space-y-6">
          
          <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-2xl font-mono text-xs space-y-4">
            <div className="border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 7 & 10: HSM Encrypted Cryptographic Vault Instance Registry</h2>
                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded font-bold uppercase tracking-wider animate-pulse">FIPS 140-3 Compliant</span>
              </div>
              <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Automated rotation policies, token lifespan parameter masks, and administrative capability validation registers bindings.</p>
            </div>

            <div className="space-y-3">
              {vault.map(item => (
                <div key={item.id} className="p-4 bg-zinc-950 border border-zinc-900/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-violet-400 font-bold font-sans text-sm">{item.name}</span>
                      <span className="text-zinc-700">|</span>
                      <span className="text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border border-zinc-800">{item.type}</span>
                      <span className="text-zinc-600 text-[10px]">Env: <strong>{item.environment}</strong></span>
                    </div>
                    {/* Masked Sensitive Vault String Display Container */}
                    <p className="text-xs font-mono tracking-widest bg-zinc-900 text-zinc-400 p-2 rounded border border-zinc-900/60 select-all select-none break-all">{item.maskedValue}</p>
                    <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                      <span>Last Rotated Timestamp: <strong className="text-zinc-400">{item.lastRotated}</strong></span>
                      <span>Rotation Strategy Bound: <strong className="text-zinc-500">{item.rotationPolicy}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => executeManualTokenRotationOverride(item.id)} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-1.5 font-bold rounded-lg transition-colors text-xs">
                      🔄 Force Micro-Rotation
                    </button>
                    <button onClick={() => alert("Viewing comprehensive access authorization audit trails trail logs...")} className="text-zinc-500 hover:text-zinc-300 transition-colors underline text-[11px]">
                      Audit Trail Logs
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================================
              SECTION 12: ENTERPRISE GOVERNANCE RISK COMPLIANCE AND CONTROL POLICIES
             ============================================================================ */}
          <section className="p-4 bg-zinc-950/20 border border-zinc-800/60 rounded-2xl font-mono text-xs space-y-3">
            <div className="border-b border-zinc-900 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 12: Corporate Governance Guardrails & Regulatory Constraints</h3>
            </div>
            
            <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed font-sans">
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 flex items-start gap-2.5">
                <span className="text-emerald-500 font-mono text-xs">✔</span>
                <p><strong className="text-zinc-200 font-mono text-[10px] uppercase bg-zinc-900 px-1 rounded mr-1">SOC2-POL-04</strong> Continuous automated evaluation constraints block unapproved OAuth platform connections from initializing without verified dual-signature architecture verification tokens.</p>
              </div>
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 flex items-start gap-2.5">
                <span className="text-emerald-500 font-mono text-xs">✔</span>
                <p><strong className="text-zinc-200 font-mono text-[10px] uppercase bg-zinc-900 px-1 rounded mr-1">HIPAA-ENC-M</strong> All server webhook payloads containing internal user identity hashes undergo automatic AES-256 GCM transposition prior to long-term storage indexing routines execution.</p>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ============================================================================
          SECTION 11: DEVELOPER HUB API PLAYGROUND SANDBOX MODULE
         ============================================================================ */}
      {currentWorkspaceSection === "devhub" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-2xl font-mono text-xs space-y-4">
          <div className="border-b border-zinc-900 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 11: Developer SDK Core Playground Integration Tools</h2>
            <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Test proxy endpoints payloads triggers inside isolated non-production storage arrays environment parameters.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block">Isolated Microservice Curl Payload Mocking Sandbox</span>
              
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-2 select-all">
                <p className="text-zinc-500"># Fire simulated pipeline token payload notification ingress mock event trigger</p>
                <p className="text-zinc-200 break-all leading-relaxed">
                  curl -X POST &quot;https://api.cat-ai.internal/v1/ingress/sandbox-mesh&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Authorization: Bearer sk_test_••••••••&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                  &nbsp;&nbsp;-d &apos;&#123; &quot;event_type&quot;: &quot;identity.sync.initialized&quot;, &quot;payload_hash_matrix&quot;: &quot;0x89f14a&quot; &#125;&apos;
                </p>
              </div>

              <button onClick={() => alert("Simulating localized curl sandbox execution request processing inside mock network matrix blocks...")} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors text-white">
                🚀 Fire Sandbox Mock Request Trigger
              </button>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Available Kernel Integration SDK Package Distributions</span>
              <p className="text-[11px] font-sans text-zinc-400 leading-relaxed">Download secure, typed multi-platform module templates containing unified ecosystem connectors maps configurations natively.</p>
              
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center p-2 bg-zinc-900 rounded border border-zinc-800/60">
                  <span className="text-zinc-200">📦 cat-ai-ecosystem-sdk-node-v4.1.tgz</span>
                  <button onClick={() => alert("Downloading node module artifact pipeline assets...")} className="text-violet-400 hover:underline">Download Tarball</button>
                </div>
                <div className="flex justify-between items-center p-2 bg-zinc-900 rounded border border-zinc-800/60">
                  <span className="text-zinc-200">📦 cat_ai_connectors_python_core_v4.whl</span>
                  <button onClick={() => alert("Downloading python wheels compiled artifact assets...")} className="text-violet-400 hover:underline">Download Wheel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}