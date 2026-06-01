"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import api from "@/lib/api";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & DATA PROTOCOLS
// ============================================================================

export type SystemSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";
export type PlatformSection = "OVERVIEW" | "USERS" | "WORKSPACES" | "AGENTS" | "KNOWLEDGE" | "SECURITY" | "COMPLIANCE" | "BILLING" | "LOGS" | "INFRASTRUCTURE" | "FLAGS" | "INCIDENTS" | "GOVERNANCE";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "Superadmin" | "Admin" | "Operator" | "User";
  workspace: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  permissions: string[];
}

export interface WorkspaceItem {
  id: string;
  name: string;
  owner: string;
  plan: "Enterprise Plus" | "Enterprise Growth" | "Core Business" | "Sandbox";
  usageQuotaPercent: number;
  status: "Active" | "Suspended" | "Throttled";
  totalAgents: number;
}

export interface AgentRegistryItem {
  id: string;
  name: string;
  tasksExecuted: number;
  accuracyRate: number;
  costUSD: number;
  memoryUsageMB: number;
  health: "Healthy" | "Degraded" | "Panicked";
}

export interface VectorKnowledgeBase {
  id: string;
  name: string;
  documentsCount: number;
  embeddingsCount: number;
  vectorDimensions: number;
  storageGB: number;
}

export interface ComplianceControl {
  id: string;
  framework: "SOC2" | "GDPR" | "HIPAA" | "ISO27001";
  name: string;
  status: "Compliant" | "Review Required" | "Non-Compliant";
  findings: number;
  remediationTask: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  workspace: string;
  severity: SystemSeverity;
}

export interface IncidentTicket {
  id: string;
  title: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  severity: "P0" | "P1" | "P2" | "P3";
  openedAt: string;
  slaRemainingMin: number;
  rootCause?: string;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  status: "GA" | "BETA" | "EXPERIMENTAL";
  rolloutPercent: number;
  isEnabled: boolean;
}

// ============================================================================
// SEED DATA REPOSITORIES (DATADOG & OPENAI TIERS)
// ============================================================================

const INITIAL_USERS: UserRow[] = [
  { id: "usr-01", email: "raghava.node@cat-ai.internal", name: "Raghava Node", role: "Superadmin", workspace: "Global Operations Matrix", is_active: true, created_at: "2024-01-12", last_login: "2026-06-01T10:04:12Z", permissions: ["*:*", "sudo_bypass", "kms_decrypt"] },
  { id: "usr-02", email: "sarah.architect@cat-ai.internal", name: "Sarah Systems", role: "Admin", workspace: "Data Infrastructure Team", is_active: true, created_at: "2024-03-15", last_login: "2026-06-01T09:42:01Z", permissions: ["users:write", "workspaces:write", "infra:read"] },
  { id: "usr-03", email: "external.vendor@partner.internal", name: "External Consultant", role: "Operator", workspace: "Third-Party Sandbox", is_active: true, created_at: "2025-06-20", last_login: "2026-05-30T14:11:55Z", permissions: ["agents:read", "logs:read"] },
  { id: "usr-04", email: "deprecate.node@cat-ai.internal", name: "Legacy Robot Context", role: "User", workspace: "Deprecation Queue", is_active: false, created_at: "2023-11-01", last_login: "2025-12-25T00:00:00Z", permissions: ["read:transient"] }
];

const INITIAL_WORKSPACES: WorkspaceItem[] = [
  { id: "wsp-01", name: "Global Operations Matrix", owner: "raghava.node@cat-ai.internal", plan: "Enterprise Plus", usageQuotaPercent: 42.8, status: "Active", totalAgents: 142 },
  { id: "wsp-02", name: "Data Infrastructure Team", owner: "sarah.architect@cat-ai.internal", plan: "Enterprise Plus", usageQuotaPercent: 89.2, status: "Active", totalAgents: 84 },
  { id: "wsp-03", name: "Third-Party Sandbox", owner: "external.vendor@partner.internal", plan: "Sandbox", usageQuotaPercent: 99.4, status: "Throttled", totalAgents: 12 },
  { id: "wsp-04", name: "Staging Pipeline Array", owner: "sarah.architect@cat-ai.internal", plan: "Enterprise Growth", usageQuotaPercent: 12.0, status: "Suspended", totalAgents: 0 }
];

const INITIAL_AGENTS: AgentRegistryItem[] = [
  { id: "agt-01", name: "Heavy Semantic Reasoner P99", tasksExecuted: 14209122, accuracyRate: 99.982, costUSD: 14209.12, memoryUsageMB: 4096, health: "Healthy" },
  { id: "agt-02", name: "Recursive Code Compiler Mesh", tasksExecuted: 8912400, accuracyRate: 98.410, costUSD: 8124.90, memoryUsageMB: 8192, health: "Healthy" },
  { id: "agt-03", name: "Autonomous Vector Chunk Indexer", tasksExecuted: 4120900, accuracyRate: 92.114, costUSD: 1940.22, memoryUsageMB: 2048, health: "Degraded" },
  { id: "agt-04", name: "Volatile Telemetry Loop Observer", tasksExecuted: 31244090, accuracyRate: 61.200, costUSD: 12400.00, memoryUsageMB: 16384, health: "Panicked" }
];

const INITIAL_KNOWLEDGE: VectorKnowledgeBase[] = [
  { id: "kb-01", name: "Corporate Wiki Core Memory", documentsCount: 142000, embeddingsCount: 42912400, vectorDimensions: 1536, storageGB: 184.2 },
  { id: "kb-02", name: "Source Code Graph Context Array", documentsCount: 89000, embeddingsCount: 31204000, vectorDimensions: 3072, storageGB: 290.4 },
  { id: "kb-03", name: "Customer CRM Transaction Ledger", documentsCount: 12000, embeddingsCount: 4500000, vectorDimensions: 1536, storageGB: 32.1 }
];

const INITIAL_COMPLIANCE: ComplianceControl[] = [
  { id: "cmp-01", framework: "SOC2", name: "Continuous Automated Token Rotation TLS 1.3", status: "Compliant", findings: 0, remediationTask: "None required" },
  { id: "cmp-02", framework: "GDPR", name: "Right-to-be-Forgotten Unstructured Text Purger", status: "Review Required", findings: 2, remediationTask: "Verify block-storage zeroization flags" },
  { id: "cmp-03", framework: "HIPAA", name: "Protected Health Data Context Anonymizer Proxy", status: "Compliant", findings: 0, remediationTask: "None required" },
  { id: "cmp-04", framework: "ISO27001", name: "Dual-Signature Physical Architecture Verification", status: "Non-Compliant", findings: 14, remediationTask: "Deploy multi-factor authorization tokens to proxy controllers" }
];

const INITIAL_LOGS: AuditLogEntry[] = [
  { id: "log-101", timestamp: "10:07:42", user: "raghava.node@cat-ai.internal", action: "KMS_DECRYPT_ROOT_KEY", target: "Vault Cluster Alpha", workspace: "Global Operations Matrix", severity: "CRITICAL" },
  { id: "log-102", timestamp: "10:06:11", user: "sarah.architect@cat-ai.internal", action: "WORKSPACE_THROTTLE_TRIGGER", target: "Third-Party Sandbox", workspace: "Data Infrastructure Team", severity: "WARN" },
  { id: "log-103", timestamp: "10:05:00", user: "SYSTEM_KERNEL_PROXY", action: "INFERENCE_NODE_AUTOSCALE", target: "Cluster Group 4-West", workspace: "System Wide Cluster", severity: "INFO" },
  { id: "log-104", timestamp: "09:58:12", user: "external.vendor@partner.internal", action: "ACCESS_DENIED_EXPLOIT_ATTEMPT", target: "Billing Matrix Ingress", workspace: "Third-Party Sandbox", severity: "ERROR" }
];

const INITIAL_INCIDENTS: IncidentTicket[] = [
  { id: "inc-01", title: "Inference Cluster West Latency Degradation P99", status: "INVESTIGATING", severity: "P0", openedAt: "12m ago", slaRemainingMin: 18, rootCause: "OOM on GPU node group 4" },
  { id: "inc-02", title: "Vector DB Replica Synchronization Delayed Data Mirror", status: "OPEN", severity: "P1", openedAt: "45m ago", slaRemainingMin: 75 },
  { id: "inc-03", title: "Stripe Enterprise Billing Webhook Non-Delivery Anomaly", status: "RESOLVED", severity: "P2", openedAt: "3h ago", slaRemainingMin: 0, rootCause: "TLS handshake expiration on edge router proxy" }
];

const INITIAL_FLAGS: FeatureFlag[] = [
  { key: "feat-recursive-reasoning", name: "Deep Tree-of-Thought Recursive Reasoning Loop", description: "Enables autonomous token feedback arrays allowing agents to verify synthetic generation tracks.", status: "EXPERIMENTAL", rolloutPercent: 5, isEnabled: true },
  { key: "feat-mTLS-mesh", name: "mTLS Intra-Cluster Microservice Communication Mesh", description: "Forces zero-trust token network access across high-volume storage pipeline clusters.", status: "BETA", rolloutPercent: 50, isEnabled: true },
  { key: "feat-streaming-analytics", name: "Realtime Streaming Ingress Analytics Aggregators", description: "Pushes kernel telemetry records directly to client dashboards via persistent sockets.", status: "GA", rolloutPercent: 100, isEnabled: true }
];

// ============================================================================
// MAIN ENTERPRISE CORE PRODUCTION PLATFORM CONSOLE
// ============================================================================

export default function AdministrativeConsolePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Active Core Navigation Switch Selector
  const [activeTab, setActiveTab] = useState<PlatformSection>("OVERVIEW");

  // Local Administrative State Engines
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(INITIAL_WORKSPACES);
  const [agents, setAgents] = useState<AgentRegistryItem[]>(INITIAL_AGENTS);
  const [knowledge, setKnowledge] = useState<VectorKnowledgeBase[]>(INITIAL_KNOWLEDGE);
  const [compliance, setCompliance] = useState<ComplianceControl[]>(INITIAL_COMPLIANCE);
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [incidents, setIncidents] = useState<IncidentTicket[]>(INITIAL_INCIDENTS);
  const [flags, setFlags] = useState<FeatureFlag[]>(INITIAL_FLAGS);

  // Search, Refinement & Virtual Filter Configurations
  const [userSearch, setUserSearch] = useState("");
  const [logSeverityFilter, setLogSeverityFilter] = useState<"ALL" | SystemSeverity>("ALL");

  // Route security gate assertion loops
  useEffect(() => {
    if (user && !(user as { is_superadmin?: boolean }).is_superadmin) {
      router.push("/dashboard/chat");
    }
  }, [user, router]);

  // Executive Core Actions Handlers
  const handleInviteUserOverride = useCallback(() => {
    const email = prompt("Enter target enterprise identity email to provision:");
    if (!email) return;
    const newUser: UserRow = {
      id: `usr-${Date.now()}`,
      email,
      name: email.split("@")[0].toUpperCase(),
      role: "User",
      workspace: "Default Allocated Sandbox",
      is_active: true,
      created_at: new Date().toISOString().split("T")[0],
      last_login: null,
      permissions: ["read:own_context"]
    };
    setUsers(prev => [newUser, ...prev]);
    alert("Enterprise structural identity vector declared into authentication storage trees.");
  }, []);

  const handleCreateWorkspaceOverride = useCallback(() => {
    const name = prompt("Declare new isolated resource corporate workspace partition name:");
    if (!name) return;
    const newWsp: WorkspaceItem = {
      id: `wsp-${Date.now()}`,
      name,
      owner: "sarah.architect@cat-ai.internal",
      plan: "Enterprise Growth",
      usageQuotaPercent: 0.0,
      status: "Active",
      totalAgents: 0
    };
    setWorkspaces(prev => [...prev, newWsp]);
    alert("Isolated resource group cluster partitioned successfully.");
  }, []);

  const handleToggleUserStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
  };

  const handleImpersonateUserSession = (email: string) => {
    alert(`Initializing administrative master session proxy takeover. Security boundary context shifting to: ${email}`);
  };

  const handleToggleFeatureFlag = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, isEnabled: !f.isEnabled } : f));
  };

  // Virtual Filter Ingestion Operations
  const processedUsers = useMemo(() => {
    return users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
  }, [users, userSearch]);

  const processedLogs = useMemo(() => {
    return logs.filter(l => logSeverityFilter === "ALL" || l.severity === logSeverityFilter);
  }, [logs, logSeverityFilter]);

  return (
    <div className="min-h-screen w-full bg-[#050507] text-zinc-100 p-6 space-y-6 font-sans antialiased overflow-x-hidden selection:bg-amber-500/30">
      
      {/* ============================================================================
          SECTION 1: EXECUTIVE ADMIN MASTER CONSOLE HEADER CONTROL MATRIX
         ============================================================================ */}
      <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-zinc-950/40 p-6 border border-zinc-900 rounded-3xl backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 animate-pulse ring-4 ring-amber-950/40" />
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-600 bg-clip-text text-transparent uppercase font-mono">CAT OS Kernel Core Administration Console</h1>
          </div>
          <p className="text-xs font-mono text-zinc-500">Security Access Class: <span className="text-amber-400 font-bold tracking-widest">SUPERADMINISTRATOR BYPASS MODE (*:*)</span> • Host Identifier: <span className="text-zinc-300">Kernel Cluster Matrix Alpha</span></p>
          
          {/* Executive Realtime Telemetry Indicators Subrow Row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 font-mono text-[11px]">
            <span className="border border-zinc-900 bg-zinc-950/80 px-2.5 py-1 rounded-md text-zinc-400">Total Indentity Graph Nodes: <strong className="text-white">1,492,091</strong></span>
            <span className="border border-zinc-900 bg-zinc-950/80 px-2.5 py-1 rounded-md text-zinc-400">Concurrent Run Active 30D: <strong className="text-emerald-400">421,900</strong></span>
            <span className="border border-zinc-900 bg-zinc-950/80 px-2.5 py-1 rounded-md text-zinc-400">Isolated Workspaces: <strong className="text-violet-400">12,401</strong></span>
            <span className="border border-zinc-900 bg-zinc-950/80 px-2.5 py-1 rounded-md text-zinc-400">Instantiated Agents Array: <strong className="text-amber-400">89,204</strong></span>
            <span className="border border-zinc-900 bg-zinc-950/80 px-2.5 py-1 rounded-md text-zinc-400">ARR Revenue Run-rate: <strong className="text-cyan-400">$42.91M</strong></span>
          </div>
        </div>

        {/* Executive Direct Mutative Operational Triggers Controls Panel */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 font-mono text-xs">
          <button onClick={handleInviteUserOverride} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-zinc-950 font-black px-4 py-2.5 rounded-xl border border-amber-500/20 shadow-xl transition-all active:scale-98">
            ➕ Provision User Node
          </button>
          <button onClick={handleCreateWorkspaceOverride} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-2.5 rounded-xl transition-colors">
            📦 Partition New Workspace Cluster
          </button>
          <button onClick={() => alert("Deploying autonomous target routing agent pipeline parameters...")} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-2.5 rounded-xl transition-colors">
            🤖 Provision Agent Instance
          </button>
          <button onClick={() => alert("Compiling absolute global infrastructure performance dump logs reports...")} className="bg-zinc-950 border border-zinc-900 text-zinc-500 px-2.5 py-2.5 rounded-xl hover:text-zinc-300 transition-colors">
            Report Engine →
          </button>
        </div>
      </header>

      {/* Global Datadog-Inspired Topography Navigation Hub */}
      <nav className="flex flex-wrap items-center gap-1 border-b border-zinc-900 pb-2">
        {([
          { id: "OVERVIEW", label: "📟 SYSTEM OVERVIEW" },
          { id: "USERS", label: "👥 USER NODE ENTITIES" },
          { id: "WORKSPACES", label: "💼 INSTANCE WORKSPACES" },
          { id: "AGENTS", label: "🤖 AGENT REGISTRY CORE" },
          { id: "KNOWLEDGE", label: "📚 VECTOR KNOWLEDGE MATRIX" },
          { id: "SECURITY", label: "🛡️ SECURITY OP CENTER" },
          { id: "COMPLIANCE", label: "📜 GOVERNANCE COMPLIANCE" },
          { id: "BILLING", label: "💳 SUBSCRIPTION LEDGER" },
          { id: "LOGS", label: "🪵 AUDIT LOG STREAM" },
          { id: "INFRASTRUCTURE", label: "🖥️ CLUSTER INFRASTRUCTURE" },
          { id: "FLAGS", label: "🚩 FEATURE ROLLOUT CENTER" },
          { id: "INCIDENTS", label: "🚨 INCIDENT MANAGEMENT TRACK" }
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 font-mono text-[10px] font-black tracking-wider rounded-lg transition-all focus:outline-none ${activeTab === tab.id ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-md" : "text-zinc-500 hover:text-zinc-300 border border-transparent"}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ============================================================================
          SECTION 2: REAL-TIME PLATFORM HEALTH CENTER TELEMETRY METRICS
         ============================================================================ */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 font-mono text-xs">
        {[
          { key: "API Gateway Matrix Routing", latency: "14ms", load: "42k req/s", status: "ONLINE", color: "text-emerald-400" },
          { key: "LLM Token Inference Proxy Tier", latency: "412ms", load: "14.2M tok/s", status: "DEGRADED LOAD", color: "text-amber-400" },
          { key: "Transactional Cluster DB Master", latency: "2.1ms", load: "890 trans/s", status: "ONLINE", color: "text-emerald-400" },
          { key: "Vector Knowledge Database Ring", latency: "11.8ms", load: "4,102 queries/s", status: "ONLINE", color: "text-emerald-400" },
          { key: "Workflow Engine Kernel Queues", latency: "0.4ms", load: "12,900 jobs/s", status: "ONLINE", color: "text-emerald-400" },
          { key: "Persistent Broker Storage Bus", latency: "42ms", load: "1.2 GB/s ingress", status: "ONLINE", color: "text-emerald-400" }
        ].map(node => (
          <div key={node.key} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500 uppercase font-bold tracking-tight truncate max-w-[120px]">{node.key}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${node.status === "ONLINE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              </div>
              <p className={`text-xs font-black mt-1 ${node.color}`}>{node.status}</p>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600 pt-1 border-t border-zinc-900/40">
              <span>Lat: <strong className="text-zinc-400">{node.latency}</strong></span>
              <span>Load: <strong className="text-zinc-400">{node.load}</strong></span>
            </div>
          </div>
        ))}
      </section>

      {/* ADMIN CONSOLE VARIABLE CONDITIONAL DATA MATRIX CORE SWITCHBOARD RENDERER */}
      
      {/* VIEWPORT CHANNEL 1: SYSTEM OVERVIEW EXECUTIVE AGGREGATED METRICS VIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* ============================================================================
              SECTION 13: PLATFORM ANALYTICS CORE CHARTS VISUAL DESIGN AREA
             ============================================================================ */}
          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4">
            <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 13: Live Token Compression & Throughput Performance Analytical Matrix</h3>
                <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Real-time telemetry stream representing vector compute optimization efficiency coefficients across all zones.</p>
              </div>
              <span className="text-[10px] bg-zinc-900 px-2 py-0.5 border border-zinc-800 rounded text-zinc-400 font-bold">INTERVAL: LIVE TICK 1s</span>
            </div>

            {/* Simulated Live Advanced Graphic Matrix Representation (Datadog style bars) */}
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                  <span>GPU Core Vector Array Allocation Threshold (Zone West Cluster Alpha)</span>
                  <span className="text-amber-400 font-bold">89.2% Utilization Bound</span>
                </div>
                <div className="h-3 bg-zinc-900 rounded overflow-hidden flex gap-0.5 p-0.5">
                  {[45, 60, 72, 80, 85, 90, 88, 92, 94, 99, 95, 89, 91, 93, 89].map((val, idx) => (
                    <div key={idx} style={{ height: `${val}%` }} className="flex-1 bg-gradient-to-t from-amber-600 to-orange-400 rounded-sm opacity-90 hover:opacity-100 transition-opacity" />
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                  <span>Intra-Cluster Network Transport Ingress Infiltration Waveforms</span>
                  <span className="text-cyan-400 font-bold">4.82 TB/s Continuous Buffer</span>
                </div>
                <div className="h-3 bg-zinc-900 rounded overflow-hidden flex gap-0.5 p-0.5">
                  {[20, 24, 30, 42, 50, 48, 55, 61, 68, 62, 59, 64, 70, 75, 80].map((val, idx) => (
                    <div key={idx} style={{ height: `${val}%` }} className="flex-1 bg-gradient-to-t from-cyan-600 to-blue-400 rounded-sm opacity-90" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dual Column Bottom Layer Overview Blocks Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* Section Snapshot: Unresolved Incident Operations Matrix */}
            <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-3">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Active Operations Center Incident Matrix Tickets</span>
              <div className="space-y-2">
                {incidents.filter(i => i.status !== "RESOLVED").map(inc => (
                  <div key={inc.id} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="bg-red-950/40 text-red-400 border border-red-900 px-1 rounded font-bold text-[9px]">{inc.severity}</span>
                        <strong className="text-zinc-200 font-sans">{inc.title}</strong>
                      </div>
                      {inc.rootCause && <p className="text-[10px] text-zinc-500">Root Anomaly Trigger: <span className="text-zinc-400 select-all font-mono bg-zinc-900 px-1 rounded">{inc.rootCause}</span></p>}
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold animate-pulse shrink-0">SLA: {inc.slaRemainingMin}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Snapshot: Enterprise Governance Constraints & Approvals */}
            <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-3">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Section 15: Corporate System Governance & Approval Ingress</span>
              <div className="space-y-2 text-[11px] leading-relaxed font-sans text-zinc-400">
                <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-start gap-2.5">
                  <span className="text-amber-500 font-mono text-xs">⚠️</span>
                  <p><strong className="text-zinc-200 font-mono text-[10px] uppercase bg-zinc-900 px-1 rounded mr-1">GOV-APPROVE-REQ</strong> Workspace &apos;Third-Party Sandbox&apos; has exceeded 99% allocated storage volume allowance constraints. Requesting superadmin approval to trigger storage auto-expansion pool scaling.</p>
                </div>
                <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-start gap-2.5">
                  <span className="text-emerald-500 font-mono text-xs">✔</span>
                  <p><strong className="text-zinc-200 font-mono text-[10px] uppercase bg-zinc-900 px-1 rounded mr-1">DATA-RETENTION</strong> Active data purging rule policy enforces absolute data retention zeroization limits within 14 days of identity termination markers.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEWPORT CHANNEL 2: USER NODE MANAGEMENT COMPONENT ADVANCED MATRIX TABLE */}
      {activeTab === "USERS" && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 3: Structural Identity Nodes Directory Matrix</h3>
                <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Edit, suspend, delete or proxy-impersonate enterprise workspace users security tokens.</p>
              </div>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="🔍 RegEx Filter global user identity space..."
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder-zinc-700 max-w-xs"
              />
            </div>

            {/* Advanced Virtualized Execution Table Interface Container */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase text-[10px] tracking-tight bg-zinc-950/80">
                    <th className="p-3">Identity Name</th>
                    <th className="p-3">Corporate Email Address</th>
                    <th className="p-3">System Access Role</th>
                    <th className="p-3">Assigned Workspace Cluster</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Authorization Trigger</th>
                    <th className="p-3 text-right">Administrative Execution Control Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                  {processedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="p-3 font-sans font-bold text-zinc-200">{u.name}</td>
                      <td className="p-3 text-zinc-400 select-all">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.role === "Superadmin" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-900 text-zinc-400"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-500 font-sans">{u.workspace}</td>
                      <td className="p-3">
                        <span className={`inline-flex h-2 w-2 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-zinc-700"}`} />
                        <span className="ml-1.5 text-zinc-400">{u.is_active ? "Authorized" : "Suspended"}</span>
                      </td>
                      <td className="p-3 text-zinc-500 text-[10px]">{u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never mapped"}</td>
                      <td className="p-3 text-right space-x-1.5">
                        <button onClick={() => handleToggleUserStatus(u.id)} className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800" : "bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/40"}`}>
                          {u.is_active ? "Suspend" : "Activate"}
                        </button>
                        <button onClick={() => handleImpersonateUserSession(u.email)} className="bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded text-[10px] hover:bg-amber-500/20 transition-all">
                          🥷 Impersonate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEWPORT CHANNEL 3: WORKSPACE DECENTRALIZED INFRASTRUCTURE PARTITIONS */}
      {activeTab === "WORKSPACES" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 font-mono text-xs animate-fadeIn">
          {workspaces.map(wsp => (
            <div key={wsp.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-sans text-sm font-black text-zinc-200 line-clamp-1">{wsp.name}</h3>
                  <span className={`px-1 rounded text-[9px] font-bold ${wsp.status === "Active" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{wsp.status}</span>
                </div>
                <p className="text-[10px] text-zinc-500 truncate">Owner identity claim: {wsp.owner}</p>
                <span className="inline-block bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] font-bold mt-1">{wsp.plan}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Resource Consumption Metrics</span>
                  <span className={wsp.usageQuotaPercent > 85 ? "text-rose-400 font-bold" : "text-zinc-400"}>{wsp.usageQuotaPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div style={{ width: `${wsp.usageQuotaPercent}%` }} className={`h-full rounded-full ${wsp.usageQuotaPercent > 85 ? "bg-rose-500" : "bg-gradient-to-r from-violet-600 to-indigo-400"}`} />
                </div>
                <div className="text-[10px] text-zinc-600">Active Instantiated Agents Cluster Array: <strong className="text-zinc-400">{wsp.totalAgents}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEWPORT CHANNEL 4: AGENT REGISTRY TELEMETRY ACCURACY PERFORMANCES */}
      {activeTab === "AGENTS" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 5: Autonomous Deep Reasoning Agent Instance Registry</h3>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {agents.map(agt => (
              <div key={agt.id} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <strong className="text-zinc-200 truncate max-w-[150px] font-sans">{agt.name}</strong>
                  <span className={`px-1 py-0.5 rounded text-[9px] uppercase font-bold ${agt.health === "Healthy" ? "bg-emerald-500/10 text-emerald-400" : agt.health === "Degraded" ? "bg-amber-500/10 text-amber-400 animate-pulse" : "bg-rose-500/10 text-rose-400 animate-bounce"}`}>{agt.health}</span>
                </div>

                <div className="space-y-1 text-[10px] text-zinc-500">
                  <div className="flex justify-between"><span>Execution Actions Run Count:</span><span className="text-zinc-300 font-bold">{agt.tasksExecuted.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Mathematical Accuracy Threshold:</span><span className="text-emerald-400 font-mono">{(agt.accuracyRate).toFixed(3)}%</span></div>
                  <div className="flex justify-between"><span>Aggregated Inference Compute Cost:</span><span className="text-cyan-400 font-bold">${agt.costUSD.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Transient VRAM Allocation Pool:</span><span className="text-violet-400 font-bold">{agt.memoryUsageMB} MB</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 5: VECTOR INFRASTRUCTURE KNOWLEDGE STORAGE BASES */}
      {activeTab === "KNOWLEDGE" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 6: Unstructured Embedding Vector Database Storage Matrix</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {knowledge.map(kb => (
              <div key={kb.id} className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                <h4 className="font-sans font-bold text-sm text-zinc-200">{kb.name}</h4>
                <div className="space-y-1 text-[11px] text-zinc-500">
                  <div className="flex justify-between"><span>Chunk Parsed Text Documents:</span><span className="text-zinc-300 font-bold">{kb.documentsCount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Total Instantiated Dense Vectors:</span><span className="text-amber-400 font-bold">{(kb.embeddingsCount / 1000000).toFixed(1)}M dimensions</span></div>
                  <div className="flex justify-between"><span>Coordinate Vector Dimensions Size:</span><span className="text-zinc-400">{kb.vectorDimensions} float32</span></div>
                  <div className="flex justify-between"><span>Persistent SAN Storage Block Allocation:</span><span className="text-violet-400 font-black">{kb.storageGB} GB</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 6: SECURITY OPERATIONS CENTER (SOC) DETECTIONS OVERVIEWS */}
      {activeTab === "SECURITY" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 7: Zero Trust Identity Security Protection Operations Hub</h3>
            <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 border border-red-500/20 rounded font-black tracking-widest uppercase">Threat Intel Active</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-zinc-500">MFA Identity Coverage Array</span>
              <p className="text-xl font-black text-emerald-400 mt-1">100.00%</p>
              <span className="text-[9px] text-zinc-600 block mt-0.5">Hardware YubiKey enforcement fully locked</span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-zinc-500">SAML SSO Connection Status</span>
              <p className="text-xl font-black text-zinc-200 mt-1">Okta Bound</p>
              <span className="text-[9px] text-zinc-600 block mt-0.5">Directory sync running error-free</span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-zinc-500">Anomalous Access Failures</span>
              <p className="text-xl font-black text-rose-500 mt-1">2 flagged</p>
              <span className="text-[9px] text-zinc-600 block mt-0.5">IP burst block geofence trigger fired</span>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-zinc-500">KMS Cryptographic Keys State</span>
              <p className="text-xl font-black text-cyan-400 mt-1">AES-GCM-256</p>
              <span className="text-[9px] text-zinc-600 block mt-0.5">Hardware secure module cluster locked</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 7: REGULATORY COMPLIANCE SYSTEM MONITOR CODES */}
      {activeTab === "COMPLIANCE" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 8: Global Compliance Frameworks Continuous Audit Ledger</h3>
          </div>

          <div className="space-y-2">
            {compliance.map(ctrl => (
              <div key={ctrl.id} className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-900 text-zinc-300 font-black border border-zinc-800 text-[10px] px-1.5 py-0.5 rounded">{ctrl.framework}</span>
                    <strong className="text-zinc-200 font-sans">{ctrl.name}</strong>
                  </div>
                  <p className="text-[10px] text-zinc-500">Remediation Vector Action: <span className="text-zinc-400 font-sans">{ctrl.remediationTask}</span></p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-[10px] text-zinc-500 font-mono">Findings: <strong className={ctrl.findings > 0 ? "text-rose-400" : "text-zinc-400"}>{ctrl.findings}</strong></span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${ctrl.status === "Compliant" ? "bg-emerald-500/10 text-emerald-400" : ctrl.status === "Review Required" ? "bg-amber-500/10 text-amber-400 animate-pulse" : "bg-rose-500/10 text-rose-400"}`}>{ctrl.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 8: CORPORATE BILLING STRIPE TIERS LEDGER ADMINDUMP */}
      {activeTab === "BILLING" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 9: Stripe Enterprise Ingress Transaction Billing Matrix</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Unbilled Accrued Usage Costs</span>
              <p className="text-lg text-amber-400 font-black mt-1">$142,091.80</p>
              <div className="text-[9px] text-zinc-600">Pending mid-cycle synchronization loop</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">MRR Subscription Volume</span>
              <p className="text-lg text-emerald-400 font-black mt-1">$3,581,900.00</p>
              <div className="text-[9px] text-zinc-600">Enterprise accounts retention threshold 99.8%</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">30-Day Forward Forecast Cost Matrix</span>
              <p className="text-lg text-cyan-400 font-black mt-1">$4,120,500.00</p>
              <div className="text-[9px] text-zinc-600">Based on model linear processing trajectory</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Failed Collection Invoice Backlog</span>
              <p className="text-lg text-zinc-400 font-black mt-1">0 invoices</p>
              <div className="text-[9px] text-zinc-600">Smart retries automation enabled</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 9: AUDIT LOG SYSTEM RESTATEMENT EXPLORER */}
      {activeTab === "LOGS" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 10: Absolute Immutable Operations Kernel Audit Stream</h3>
              <p className="text-[10px] font-sans text-zinc-500 mt-0.5">Cryptographically signed transaction sequences mapped to authorization states block.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Severity Filter:</span>
              <select
                value={logSeverityFilter}
                onChange={(e) => setLogSeverityFilter(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                <option value="ALL">ALL LEVELS</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            {processedLogs.map(log => (
              <div key={log.id} className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between gap-4 font-mono group hover:bg-zinc-900/10 transition-colors">
                <div className="flex items-center gap-3 truncate">
                  <span className={`text-[9px] font-black px-1 rounded min-w-[65px] text-center ${log.severity === "CRITICAL" ? "bg-red-500 text-zinc-950" : log.severity === "ERROR" ? "bg-red-950/40 text-red-400 border border-red-900" : log.severity === "WARN" ? "bg-amber-950/40 text-amber-400 border border-amber-900" : "bg-zinc-900 text-zinc-500"}`}>{log.severity}</span>
                  <span className="text-zinc-600 text-[10px]">{log.timestamp}</span>
                  <span className="text-zinc-400 truncate font-sans max-w-[200px]">{log.user}</span>
                  <span className="text-zinc-600">→</span>
                  <strong className="text-zinc-100 select-all tracking-tight text-xs">{log.action}</strong>
                </div>
                <div className="text-right shrink-0 text-zinc-500 text-[10px] truncate max-w-[150px] font-sans">Target: {log.target}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 10: INFRASTRUCTURE COMPUTE TELEMETRY BARS NODES */}
      {activeTab === "INFRASTRUCTURE" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 11: Realtime Compute Engine Infrastructure Hardware Monitoring Matrix</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { type: "GPU Inference Matrix Array Clusters", allocation: "89.2% Active VRAM load", specs: "128x NVIDIA H100 SXM5 Tensor Nodes" },
              { type: "Vector Clustering Vector Search Ring", allocation: "42.1% Disk index alignment", specs: "24x Distributed NVMe High-IOPS Nodes" },
              { type: "Core Redis Cache Orchestration Layer", allocation: "12.0% Volatile RAM bound", specs: "RAM Cache Topology Cluster Group Alpha" }
            ].map((infra, index) => (
              <div key={index} className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                <span className="text-zinc-200 font-sans font-bold block text-sm">{infra.type}</span>
                <p className="text-amber-400 font-bold">{infra.allocation}</p>
                <span className="text-[10px] text-zinc-600 block leading-tight font-sans">{infra.specs}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 11: FEATURE FLAG DEPLOYMENT ROLLOUT CONTROL LAYER */}
      {activeTab === "FLAGS" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 12: Declarative Feature Toggle & Controlled Grayscale Rollout Center</h3>
          </div>

          <div className="space-y-3">
            {flags.map(flag => (
              <div key={flag.key} className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-zinc-200 text-sm font-sans font-bold">{flag.name}</strong>
                    <span className="text-zinc-700">|</span>
                    <span className="text-zinc-500 text-[9px] font-bold bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded uppercase">{flag.status}</span>
                    <span className="text-zinc-600 text-[10px]">Registry Key: <code className="text-zinc-400 bg-zinc-900/60 px-1 rounded font-mono text-[11px] select-all">{flag.key}</code></span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">{flag.description}</p>
                  <div className="text-[10px] text-zinc-600">Grayscale Target Blast Radius Population Volume Allocation: <strong className="text-zinc-400">{flag.rolloutPercent}% Rollout Threshold</strong></div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleToggleFeatureFlag(flag.key)}
                    className={`px-4 py-1.5 rounded-xl text-center font-bold font-mono transition-all border text-xs ${flag.isEnabled ? "bg-emerald-950/30 border-emerald-900 text-emerald-400 hover:bg-emerald-900/40" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}
                  >
                    {flag.isEnabled ? "🟢 FORCE ENABLED ACTIVE" : "⚪ TERMINATED INACTIVE"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEWPORT CHANNEL 12: INCIDENT MANAGEMENT TRIAGE DISPATCH MATRIX */}
      {activeTab === "INCIDENTS" && (
        <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl font-mono text-xs space-y-4 animate-fadeIn">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Section 14: Platform Incident Management & Live Triage Warroom Operations</h3>
          </div>

          <div className="space-y-2.5">
            {incidents.map(inc => (
              <div key={inc.id} className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between gap-4 font-mono">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-1 rounded text-[10px] font-black ${inc.severity === "P0" ? "bg-red-500 text-zinc-950" : inc.severity === "P1" ? "bg-red-950/40 text-red-400 border border-red-900" : "bg-zinc-900 text-zinc-500"}`}>{inc.severity}</span>
                    <strong className="text-zinc-100 font-sans text-sm font-bold">{inc.title}</strong>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-500 text-[10px]">Opened: {inc.openedAt}</span>
                  </div>
                  {inc.rootCause && (
                    <p className="text-[11px] text-zinc-500 font-sans font-medium">Root Cause Analysis Dump: <span className="font-mono text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-900 select-all">{inc.rootCause}</span></p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${inc.status === "RESOLVED" ? "bg-zinc-900 text-zinc-500" : inc.status === "INVESTIGATING" ? "bg-amber-500/10 text-amber-400 animate-pulse" : "bg-red-500/10 text-red-400"}`}>{inc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}