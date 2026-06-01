"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// ── DATA TYPE DEFINITIONS ───────────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  color: string;
}

interface KPIProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  sparkData: number[];
  sparkColor: string;
  icon: React.ReactNode;
  subtitle: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  status: "success" | "active" | "failed" | "queued";
  duration: string;
  owner: string;
  trigger: string;
  result: string;
  timestamp: string;
}

interface AgentItem {
  name: string;
  role: string;
  tasks: number;
  accuracy: string;
  memory: string;
  health: "nominal" | "degraded" | "critical";
  load: number;
}

interface KnowledgeSourceItem {
  name: string;
  type: string;
  vectors: string;
  chunks: string;
  accuracy: string;
  status: "synced" | "syncing" | "error";
  size: string;
}

interface TokenUsageData {
  time: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  forecast: number;
}

interface ActivityFeedItem {
  id: string;
  type: "workflow" | "agent" | "knowledge" | "user" | "api" | "security";
  message: string;
  actor: string;
  target: string;
  timestamp: string;
  severity: "info" | "warning" | "critical" | "success";
}

interface TaskItem {
  id: string;
  title: string;
  type: "workflow" | "agent" | "maintenance" | "approval";
  schedule: string;
  status: string;
  assignedTo: string;
}

interface AuditLogItem {
  id: string;
  event: string;
  user: string;
  ip: string;
  location: string;
  timestamp: string;
  status: "granted" | "denied" | "flagged";
}

// ── CUSTOM SPARKLINE MICRO-CHART ─────────────────────────────────────────────
function Sparkline({ data, color }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const width = 100;
  const height = 30;
  
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-8 w-24 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

// ── PREMIUM METRIC EXECUTIVE CARD ────────────────────────────────────────────
function ExecutiveKPICard({ title, value, change, trend, sparkData, sparkColor, icon, subtitle }: KPIProps) {
  const isUp = trend === "up";
  const isDown = trend === "down";
  
  const trendColor = isUp 
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
    : isDown 
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20" 
      : "text-zinc-400 bg-zinc-800/40 border-zinc-700/30";

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:shadow-zinc-950/50 group focus-within:ring-2 focus-within:ring-[#0070f3]">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent group-hover:via-[#0070f3]/40" />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-mono font-medium tracking-wider text-zinc-500 uppercase">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight text-white font-sans">{value}</h3>
        </div>
        <div className="rounded-lg bg-zinc-950/80 p-2 text-zinc-400 border border-zinc-800 shadow-inner group-hover:text-white transition-colors">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800/40 pt-3">
        <div className="flex flex-col gap-0.5">
          <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold ${trendColor}`}>
            {isUp ? "↑" : isDown ? "↓" : "↔"} {change}
          </span>
          <span className="text-[10px] text-zinc-500 tracking-wide mt-0.5">{subtitle}</span>
        </div>
        <div className="flex items-end opacity-80 group-hover:opacity-100 transition-opacity">
          <Sparkline data={sparkData} color={sparkColor} />
        </div>
      </div>
    </div>
  );
}

// ── CORE HOMEPAGE COMPONENT ──────────────────────────────────────────────────
export default function DashboardPage() {
  // Client state context variables
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + " | " + 
        now.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // SECTION 2 DATA: MEMOIZED INFRASTRUCTURE EXECUTIVE CARDS DATA MATRIX
  const kpiMetrics = useMemo<KPIProps[]>(() => [
    {
      title: "Active Autonomous Agents",
      value: "419 / 500",
      change: "+12.4%",
      trend: "up",
      sparkData: [380, 392, 395, 402, 410, 408, 419],
      sparkColor: "#0070f3",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      subtitle: "83.8% Capacity Allocation",
    },
    {
      title: "Active Pipelines / Workflows",
      value: "1,842 Instances",
      change: "Stable",
      trend: "neutral",
      sparkData: [1840, 1845, 1838, 1842, 1841, 1844, 1842],
      sparkColor: "#a1a1aa",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      subtitle: "Avg 14.2s runtime footprint",
    },
    {
      title: "Distributed RAG Context Size",
      value: "84.1M Vectors",
      change: "+4.2% Today",
      trend: "up",
      sparkData: [80.1, 81.2, 81.9, 82.5, 83.1, 83.6, 84.1],
      sparkColor: "#7928ca",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      subtitle: "294,103 source docs parsed",
    },
    {
      title: "Inference Token Ingestion Rate",
      value: "38.4M / hr",
      change: "-1.8%",
      trend: "down",
      sparkData: [40.2, 39.8, 41.1, 38.9, 39.2, 38.1, 38.4],
      sparkColor: "#f5a623",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      subtitle: "Optimized LLM context paths",
    },
    {
      title: "Platform Success / Accuracy",
      value: "99.94%",
      change: "+0.02%",
      trend: "up",
      sparkData: [99.91, 99.92, 99.92, 99.93, 99.94, 99.93, 99.94],
      sparkColor: "#10b981",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      subtitle: "31M calls zero-fault bounds",
    }
  ], []);

  // SECTION 4 DATA: LIVE IN-FLIGHT WORKFLOW ARRAYS
  const workflowsList = useMemo<WorkflowItem[]>(() => [
    { id: "trace-910A", name: "Enterprise ERP Ingestion Vectorization", status: "active", duration: "18.4s elapsed", owner: "SecOps Core", trigger: "S3 Event Webhook", result: "Streaming 8,142 chunks", timestamp: "09:54:12" },
    { id: "trace-44C1", name: "Cross-Model Optimization Fallback Matrix", status: "success", duration: "412ms", owner: "SysDev Automation", trigger: "Latency Spike Alert", result: "Swapped gpt-4o to Claude-3.5", timestamp: "09:52:01" },
    { id: "trace-002E", name: "SOC2 Compliance Baseline Audit Validation", status: "success", duration: "3.84s", owner: "SecOps Bot", trigger: "CRON (Hourly)", result: "0 Non-Compliance Markers", timestamp: "09:00:00" },
    { id: "trace-119X", name: "Financial Quarter Sentiment Analytics Parsing", status: "failed", duration: "1.24s", owner: "Finance Exec Node", trigger: "REST Dispatch", result: "Token Rate Limit Exceeded (429)", timestamp: "08:42:19" },
    { id: "trace-7781", name: "Autonomous Memory Graph Compaction", status: "queued", duration: "Pending", owner: "GraphEngine Bot", trigger: "Threshold Limit (80%)", result: "Awaiting cluster slice lock", timestamp: "08:15:00" }
  ], []);

  // SECTION 5 DATA: AUTONOMOUS AGENTS MATRIX POOL
  const agentsList = useMemo<AgentItem[]>(() => [
    { name: "Alpha-Orchestrator-X", role: "Dynamic Model Context Router", tasks: 14209, accuracy: "99.98%", memory: "1.2GB / 4.0GB", health: "nominal", load: 42 },
    { name: "Semantic-Mesh-Ingestor", role: "Vector Chunk Embedder & Graph Syncer", tasks: 8412, accuracy: "99.41%", memory: "3.1GB / 8.0GB", health: "nominal", load: 78 },
    { name: "Guardrail-Compliance-Shield", role: "PII & Prompt Injection Firewall", tasks: 31094, accuracy: "100.00%", memory: "0.8GB / 2.0GB", health: "nominal", load: 24 },
    { name: "Financial-SaaS-Analyst", role: "Quantitative Projection Estimator", tasks: 1241, accuracy: "94.20%", memory: "2.8GB / 4.0GB", health: "degraded", load: 92 },
    { name: "Cluster-Self-Healer-Bot", role: "Docker Sandbox Cycle Recycler", tasks: 412, accuracy: "98.11%", memory: "0.5GB / 2.0GB", health: "critical", load: 5 }
  ], []);

  // SECTION 6 DATA: KNOWLEDGE BASES GRAPH SPECIFICS
  const knowledgeSources = useMemo<KnowledgeSourceItem[]>(() => [
    { name: "aws-s3-regulatory-compliance", type: "Document Blob Store", vectors: "42.8M", chunks: "142k chunks", accuracy: "99.8%", status: "synced", size: "41.2 GB" },
    { name: "postgres-relational-customer-meta", type: "Database Table Sync", vectors: "31.0M", chunks: "90k chunks", accuracy: "99.2%", status: "synced", size: "18.4 GB" },
    { name: "confluence-internal-knowledge-wiki", type: "HTML/Markdown Scraper", vectors: "10.3M", chunks: "42k chunks", accuracy: "94.5%", status: "syncing", size: "5.1 GB" }
  ], []);

  // SECTION 7 DATA: TOKEN CONSUMPTION TELEMETRY TREND LINES matrix
  const tokenUsageMetrics = useMemo<TokenUsageData[]>(() => [
    { time: "06:00", promptTokens: 14.2, completionTokens: 4.1, cost: 36.6, forecast: 38.2 },
    { time: "07:00", promptTokens: 18.1, completionTokens: 5.8, cost: 47.8, forecast: 46.5 },
    { time: "08:00", promptTokens: 22.4, completionTokens: 7.2, cost: 59.2, forecast: 58.0 },
    { time: "09:00", promptTokens: 28.9, completionTokens: 9.5, cost: 76.8, forecast: 74.2 },
  ], []);

  // SECTION 8 DATA: REAL-TIME GLOBAL PLATFORM AUDIT EVENT STREAM
  const activityFeed = useMemo<ActivityFeedItem[]>(() => [
    { id: "act-01", type: "security", message: "MFA challenge bypassed via trusted service principal node token lease", actor: "Node-Svc-04", target: "Cluster Access", timestamp: "2m ago", severity: "info" },
    { id: "act-02", type: "agent", message: "Automated scaling activated for Semantic-Mesh-Ingestor pool due to vector queue lag", actor: "CAT-OS-Autoscaler", target: "Replica Set", timestamp: "5m ago", severity: "success" },
    { id: "act-03", type: "knowledge", message: "Index corruption fault bounds detected in partition us-east-1-p2", actor: "pgvector-monitor", target: "Index Table", timestamp: "12m ago", severity: "critical" },
    { id: "act-04", type: "workflow", message: "Workflow trace-119X hard failure caught via core framework fallback routing blocks", actor: "Engine-Core-X", target: "trace-119X", timestamp: "17m ago", severity: "warning" },
    { id: "act-05", type: "user", message: "Configuration parameters modified for active platform safety guardrails configuration", actor: "raghava@cat.ai", target: "Guardrail-Shield", timestamp: "24m ago", severity: "warning" }
  ], []);

  // SECTION 9 DATA: SCHEDULED TASKS PIPELINE QUEUE
  const upcomingTasks = useMemo<TaskItem[]>(() => [
    { id: "task-01", title: "Complete Vector Graph Compaction Cron Execution", type: "maintenance", schedule: "In 5 minutes", status: "Staged", assignedTo: "GraphEngine Bot" },
    { id: "task-02", title: "Approve High-Cost Token Allocation Request ($4,500 budget cap bump)", type: "approval", schedule: "Awaiting Review", status: "Blocked", assignedTo: "Workspace Owner" },
    { id: "task-03", title: "Periodic Model Fine-Tuning Hyperparameter Evaluation Loop Run", type: "agent", schedule: "At 12:00 UTC", status: "Scheduled", assignedTo: "Alpha-Orchestrator" }
  ], []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 antialiased selection:bg-[#0070f3]/30 selection:text-white">
      
      {/* GLOBAL ENTERPRISE TOP META STATUS BANNER */}
      <div className="border-b border-zinc-800/60 bg-[#09090b] py-2 font-mono text-[10px] text-zinc-500">
        <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold tracking-wider">
              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
              INFRASTRUCTURE GRID NOMINAL
            </span>
            <span className="text-zinc-800">|</span>
            <span>API Gateway Throughput: <span className="text-white">99.998%</span></span>
            <span className="text-zinc-800">|</span>
            <span>Cluster Context Nodes Latency: <span className="text-zinc-400">14ms avg</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Global Tenant Reference: <span className="text-zinc-300">cat-ai-enterprise-grid-x89</span></span>
          </div>
        </div>
      </div>

      {/* SECTION 1: WELCOME CONTROL HEADER PANEL ANCHOR */}
      <header className="border-b border-zinc-800/40 bg-zinc-900/10 py-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-1/4 h-32 w-96 bg-gradient-to-br from-[#0070f3]/10 to-[#7928ca]/10 blur-3xl pointer-events-none rounded-full" />
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#0070f3]">
              <span>Executive AI Operating Command Center</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>Production Zone A</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">
              Good Morning, Raghava
            </h1>
            <p className="mt-1 text-xs text-zinc-400 max-w-xl leading-relaxed">
              Your CAT AI infrastructure is operating at <span className="text-white font-semibold">maximum efficiency parameters</span>. All cluster micro-agent routines are currently synchronized with local vector context graphs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-[11px] text-zinc-400 flex items-center gap-2 h-9 shadow-inner">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>{currentDateTime || "Loading Node Epoch Time..."}</span>
            </div>
            <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 h-9">
              {(["24h", "7d", "30d"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`rounded-md px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none ${timeframe === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-[#0070f3] to-[#7928ca] px-4 text-xs font-bold text-white shadow-lg shadow-[#0070f3]/10 transition-all hover:opacity-95 active:scale-[0.98]">
              Provision Orchestrator +
            </button>
          </div>
        </div>
      </header>

      {/* CORE INTEGRATED METRIC MONITOR GRID PANELS CONTAINER */}
      <main className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* SECTION 2: EXECUTIVE KPI OVERVIEW SCALING BLOCK GRID */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpiMetrics.map((kpi, idx) => (
            <ExecutiveKPICard key={idx} {...kpi} />
          ))}
        </section>

        {/* CONTEXT DATA VISUALIZATION TRACK LAYER STRIP SPLIT */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* SECTION 3: AI OPERATIONS OVERVIEW TELEMETRY MODULE */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Cluster Ingest Inference Telemetry Rate</h2>
                  <p className="text-[11px] text-zinc-500">Live tokens allocation load profiles parsed across model endpoint clusters.</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-2 py-0.5 font-mono text-[9px] text-zinc-400 border border-zinc-800">
                  <span className="h-1 w-1 rounded-full bg-[#0070f3] animate-ping" />
                  <span>Realtime Dispatch Analytics</span>
                </div>
              </div>

              {/* BAR VISUALIZATION ENGINE GENERATOR MOCK */}
              <div className="my-6 flex h-40 items-end gap-2 border-b border-l border-zinc-800/60 px-3 pb-1 pt-4 relative">
                {/* Background threshold guide lines */}
                <div className="absolute inset-x-0 bottom-1/4 border-b border-zinc-800/20 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-1/2 border-b border-zinc-800/20 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-3/4 border-b border-zinc-800/20 pointer-events-none" />

                {tokenUsageMetrics.map((metric, index) => {
                  const totalTokens = metric.promptTokens + metric.completionTokens;
                  const promptPercent = (metric.promptTokens / 40) * 100;
                  const completionPercent = (metric.completionTokens / 40) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col justify-end h-full gap-0.5 group relative">
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 bg-zinc-950 border border-zinc-800 p-2 rounded-md font-mono text-[9px] text-zinc-300 whitespace-nowrap shadow-xl">
                        <p className="text-white font-bold mb-0.5">Epoch Slice {metric.time}</p>
                        <p className="text-[#0070f3]">Prompt: {metric.promptTokens}M t</p>
                        <p className="text-[#7928ca]">Compl: {metric.completionTokens}M t</p>
                        <p className="text-emerald-400 border-t border-zinc-800 mt-1 pt-0.5">Agg Cost: ${metric.cost}</p>
                      </div>
                      <div className="w-full bg-gradient-to-t from-[#7928ca]/20 to-[#7928ca] rounded-t-sm transition-all duration-300 hover:opacity-90" style={{ height: `${completionPercent}%` }} />
                      <div className="w-full bg-gradient-to-t from-[#0070f3]/20 to-[#0070f3] rounded-t-sm transition-all duration-300 hover:opacity-90" style={{ height: `${promptPercent}%` }} />
                      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 font-mono text-[9px] text-zinc-500 whitespace-nowrap">{metric.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between border-t border-zinc-800/30 pt-4 gap-2 font-mono text-[10px]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-[#0070f3]" />
                  <span className="text-zinc-400">Prompt Context Payload Token Input</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-[#7928ca]" />
                  <span className="text-zinc-400">Completion Generation Weight Output</span>
                </div>
              </div>
              <span className="text-zinc-500">Telemetry Data Refresh Cycle: 1000ms</span>
            </div>
          </div>

          {/* TELEMETRY METRIC SYNC CAPACITIES BLOCK MODULE */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Live Queue Latency Diagnostics</h2>
                <p className="text-[11px] text-zinc-500">Physical cluster backplane capacity boundaries allocation markers.</p>
              </div>

              <div className="space-y-3.5 font-mono">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium">
                    <span className="text-zinc-400">Vector Index Search (pgvector Graph)</span>
                    <span className="text-white font-bold">0.34ms / 1.0ms SLA</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/40">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-[#0070f3] rounded-full w-[34%]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium">
                    <span className="text-zinc-400">Inference Request Ingestion Queue</span>
                    <span className="text-white font-bold">12 req/sec execution</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/40">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full w-[18%]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium">
                    <span className="text-zinc-400">Agent Visual Workflow Queue Pipeline</span>
                    <span className="text-amber-400 font-bold">84% Capacity Load Alert</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/40">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full w-[84%]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium">
                    <span className="text-zinc-400">Knowledge Context Base Sync Drop Rate</span>
                    <span className="text-white font-bold">0.00% Error Threshold</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/40">
                    <div className="h-full bg-zinc-700 rounded-full w-[1%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-zinc-950 border border-zinc-800/80 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <div className="font-mono text-[10px]">
                  <p className="text-zinc-300 font-bold">Optimization Core Action Recommended</p>
                  <p className="text-zinc-500 text-[9px]">Workflow queues are scaling up. Increase active runner slice pool.</p>
                </div>
              </div>
              <button className="rounded bg-zinc-800 hover:bg-zinc-700 font-mono text-[9px] font-bold text-white px-2 py-1 border border-zinc-700 transition-colors">
                Prune Queue
              </button>
            </div>
          </div>
        </div>

        {/* DOUBLE SUBSECTION MATRIX ARCHITECTURE BLOCK SPLIT */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* SECTION 4: LIVE WORKFLOW ACTIVITY TRACK VIEW TRACES */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl">
            <div className="mb-3.5 flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <div className="space-y-0.5">
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Live Workflow Pipeline Executions</h2>
                <p className="text-[11px] text-zinc-500">Autonomous sequence automation triggers currently traversing context nodes.</p>
              </div>
              <span className="rounded bg-zinc-950 border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">Live Traces</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <th className="pb-2 font-medium">Trace ID</th>
                    <th className="pb-2 font-medium">Workflow Pipeline</th>
                    <th className="pb-2 font-medium">Trigger Source</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-xs text-zinc-300">
                  {workflowsList.map((wf) => {
                    const statusStyle = 
                      wf.status === "active" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse" :
                      wf.status === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      wf.status === "failed" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700/50";
                    return (
                      <tr key={wf.id} className="hover:bg-zinc-900/30 transition-colors group">
                        <td className="py-3 font-mono text-[11px] text-zinc-500 group-hover:text-zinc-400">{wf.id}</td>
                        <td className="py-3 font-medium">
                          <p className="text-zinc-200">{wf.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Owner: {wf.owner} • {wf.result}</p>
                        </td>
                        <td className="py-3 font-mono text-[10px] text-zinc-400">{wf.trigger}</td>
                        <td className="py-3 font-mono text-[11px] text-zinc-500">{wf.duration}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${statusStyle}`}>
                            {wf.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5: AGENT PERFORMANCE RUNTIME MATRIX */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl">
            <div className="mb-3.5 flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <div className="space-y-0.5">
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Agent Performance Metrics Pool</h2>
                <p className="text-[11px] text-zinc-500">Autonomous model task executors sanity, throughput, and accuracy scores.</p>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">Total Micro-Instances: 419</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <th className="pb-2 font-medium">Agent Instance Designation</th>
                    <th className="pb-2 font-medium">Tasks Resolved</th>
                    <th className="pb-2 font-medium">Accuracy Benchmark</th>
                    <th className="pb-2 font-medium">Allocated RAM</th>
                    <th className="pb-2 font-medium text-right">Sanity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-xs text-zinc-300">
                  {agentsList.map((agent, i) => {
                    const healthStyle = 
                      agent.health === "nominal" ? "bg-emerald-500" :
                      agent.health === "degraded" ? "bg-amber-500 animate-pulse" : "bg-rose-600 animate-ping";
                    return (
                      <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-3.5">
                          <p className="font-semibold text-zinc-100">{agent.name}</p>
                          <p className="text-[10px] text-zinc-500 tracking-wide">{agent.role}</p>
                        </td>
                        <td className="py-3.5 font-mono text-[11px] text-zinc-400">{agent.tasks.toLocaleString()}</td>
                        <td className="py-3.5 font-mono text-[11px] text-emerald-400 font-bold">{agent.accuracy}</td>
                        <td className="py-3.5 font-mono text-[10px] text-zinc-500">
                          <div className="flex flex-col gap-1">
                            <span>{agent.memory}</span>
                            <div className="h-1 w-20 rounded-full bg-zinc-950 overflow-hidden">
                              <div className="h-full bg-zinc-700" style={{ width: `${agent.load}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 border border-zinc-800 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                            <span className={`h-1.5 w-1.5 rounded-full ${healthStyle}`} />
                            {agent.health}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* SECTION 6: KNOWLEDGE BASE VECTOR ANALYTICS POOL */}
        <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl">
          <div className="mb-4 flex flex-col gap-2 border-b border-zinc-800/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Knowledge Base Vector Graph Infrastructure</h2>
              <p className="text-[11px] text-zinc-500">Storage capacities, token chunk slicing strategy accuracy, and synchronization state logs.</p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-zinc-500">Total Virtual Storage Allotment:</span>
              <span className="text-white font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">64.7 GB / 100 GB</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {knowledgeSources.map((source, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col justify-between group hover:border-zinc-700 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold font-mono text-zinc-200 truncate max-w-[160px]">{source.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-sans mt-0.5">{source.type}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${source.status === "synced" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"}`}>
                      {source.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-b border-zinc-900 py-2.5 my-2 font-mono text-[11px]">
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase font-sans">VECTORS CONSTRUCTED</p>
                      <p className="text-white font-bold tracking-tight mt-0.5">{source.vectors}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500 uppercase font-sans">CHUNK SLICES COUNT</p>
                      <p className="text-zinc-300 font-medium mt-0.5">{source.chunks}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] pt-1.5 text-zinc-400">
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500">Search Hit:</span>
                    <span className="text-emerald-400 font-bold">{source.accuracy}</span>
                  </div>
                  <span className="text-zinc-500">{source.size} allocation</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* THREE COLUMN ARCHITECTURE FOOTER ACTIVITY AND SAFETY TRACK GRID */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* SECTION 8: REAL-TIME GLOBAL PLATFORM AUDIT EVENT STREAM FEED */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="mb-3.5 border-b border-zinc-800/60 pb-2.5 flex items-center justify-between">
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">System Cluster Audit Stream</h2>
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              </div>

              <div className="space-y-3 font-mono text-[11px] max-h-[310px] overflow-y-auto custom-scrollbar pr-1">
                {activityFeed.map((feed) => {
                  const severityBadge = 
                    feed.severity === "critical" ? "text-rose-400 bg-rose-500/10" :
                    feed.severity === "warning" ? "text-amber-400 bg-amber-500/10" :
                    feed.severity === "success" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 bg-zinc-800";
                  return (
                    <div key={feed.id} className="p-2 rounded-lg border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/90 transition-all flex flex-col gap-1.5 relative group">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-sm px-1 text-[9px] font-bold uppercase tracking-wide ${severityBadge}`}>
                          {feed.type}
                        </span>
                        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors">{feed.timestamp}</span>
                      </div>
                      <p className="text-zinc-300 font-sans leading-relaxed text-xs">{feed.message}</p>
                      <div className="text-[10px] text-zinc-500 border-t border-zinc-900/50 pt-1 flex justify-between">
                        <span>Actor: <span className="text-zinc-400">{feed.actor}</span></span>
                        <span>Dest: <span className="text-zinc-400">{feed.target}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="w-full mt-4 rounded-lg bg-zinc-950 hover:bg-zinc-900 font-mono text-[10px] font-bold text-zinc-400 hover:text-white py-2 border border-zinc-800/80 text-center transition-colors">
              Access Full Log Database Trace View
            </button>
          </div>

          {/* SECTION 9: UPCOMING SCHEDULER TASKS MONITOR */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="mb-3.5 border-b border-zinc-800/60 pb-2.5">
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Upcoming Automated Cron Queue</h2>
              </div>

              <div className="space-y-2.5 font-sans">
                {upcomingTasks.map((task) => {
                  const typeIcon = 
                    task.type === "maintenance" ? "🔧" :
                    task.type === "approval" ? "🔐" : "🤖";
                  return (
                    <div key={task.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/20 flex items-start gap-3 hover:border-zinc-700 transition-colors">
                      <div className="text-lg bg-zinc-950 p-1.5 rounded-lg border border-zinc-900 shadow-inner shrink-0">{typeIcon}</div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-zinc-500">{task.id}</span>
                          <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-[9px] text-zinc-400">{task.status}</span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 truncate leading-snug">{task.title}</p>
                        <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 pt-0.5">
                          <span>Run: <span className="text-zinc-400 font-medium">{task.schedule}</span></span>
                          <span>Assigned: <span className="text-[#0070f3]">{task.assignedTo}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 font-sans text-xs">
              <p className="font-bold text-purple-300">Continuous Integration Model Deploy Scheduled</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">Next production fine-tuning cycle scheduled to compile in 2 hours. Ensure weights parameters check bounds.</p>
            </div>
          </div>

          {/* SECTION 10: ENTERPRISE SECURITY PLATFORM MONITOR */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-zinc-800/60 pb-2.5">
                <h2 className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">Enterprise Cryptographic Security Compliance</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-900 flex flex-col gap-0.5">
                  <span className="text-zinc-500">MFA MATRIX PROTECTION</span>
                  <span className="text-emerald-400 font-bold tracking-wide uppercase">100% ENFORCED</span>
                </div>
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-900 flex flex-col gap-0.5">
                  <span className="text-zinc-500">SSO FEDERATION IDENT</span>
                  <span className="text-emerald-400 font-bold tracking-wide uppercase">SAML2 PASS</span>
                </div>
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-900 flex flex-col gap-0.5">
                  <span className="text-zinc-500">WORKSPACE GOVERNANCE</span>
                  <span className="text-white font-bold tracking-wide">SOC2 TYPE II</span>
                </div>
                <div className="rounded-lg bg-zinc-950 p-2.5 border border-zinc-900 flex flex-col gap-0.5">
                  <span className="text-zinc-500">SECURITY RISK SIGS</span>
                  <span className="text-zinc-400 font-bold tracking-wide">0 ACTIVE DISPATCH</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Recent Infrastructure Access Leases Granted</p>
                <div className="space-y-1.5 font-mono text-[10px] text-zinc-400 max-h-24 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between p-1 rounded hover:bg-zinc-950/40">
                    <span className="truncate max-w-[120px] text-zinc-300">192.168.1.104 via US-WEST-2</span>
                    <span className="text-emerald-400 font-bold">GRANTED</span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded hover:bg-zinc-950/40">
                    <span className="truncate max-w-[120px] text-zinc-300">10.0.4.12 via NAT Gateway</span>
                    <span className="text-emerald-400 font-bold">GRANTED</span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded hover:bg-zinc-950/40">
                    <span className="truncate max-w-[120px] text-zinc-300">84.21.19.42 via FRA-NODE-0</span>
                    <span className="text-amber-400 font-bold animate-pulse">FLAGGED CHALLENGE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800/40 pt-4 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">Vault Key Rotation Lease: 4d left</span>
              <button className="rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 font-mono text-[10px] font-bold text-white px-2.5 py-1.5 transition-colors">
                Rotate Master Cryptographic Key Lease
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}