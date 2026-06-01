"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ── TYPES & INTERFACES ───────────────────────────────────────────────────────
export type ModelId = "gpt-4-1" | "gpt-5" | "claude-opus" | "claude-sonnet" | "gemini-pro" | "llama-3-3" | "mistral-large" | "deepseek-v3";

export interface ModelMetadata {
  id: ModelId;
  name: string;
  provider: string;
  costPerMillion: string;
  latency: string;
  capability: "Max" | "High" | "Medium";
  contextWindow: string;
  color: string;
}

export interface Workspace {
  id: string;
  name: string;
  tier: "Enterprise" | "Team" | "Sandbox";
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
}

export interface Folder {
  id: string;
  name: string;
  projectId: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  folderId?: string;
  projectId: string;
  workspaceId: string;
  isPinned: boolean;
  isBookmarked: boolean;
  updatedAt: string;
}

export interface Citation {
  id: string;
  sourceName: string;
  score: number;
  snippet: string;
  pageNumber?: number;
  filePath: string;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  arguments: string;
  status: "executing" | "authorized" | "denied" | "completed";
  output?: string;
}

export interface MultiAgentStep {
  agentName: "ResearchAgent" | "AnalysisAgent" | "CodingAgent" | "PlanningAgent" | "ExecutiveAgent";
  status: "idle" | "reasoning" | "outputting" | "completed";
  summary: string;
  outputLog: string[];
}

export interface TokenMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  tokensPerSecond: number;
}

export interface MessageNode {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  modelId?: ModelId;
  citations?: Citation[];
  toolCalls?: ToolCallPayload[];
  agentsData?: MultiAgentStep[];
  metrics?: TokenMetrics;
  attachedWorkflowId?: string;
  warning?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "uploading" | "synced" | "error";
  progress: number;
}

export interface ActiveWorkflow {
  id: string;
  name: string;
  status: "staged" | "running" | "completed";
  triggerType: "immediate" | "scheduled";
}

// ── STATIC METADATA DICTIONARIES ─────────────────────────────────────────────
const WORKSPACES: Workspace[] = [
  { id: "ws-cat-core", name: "CAT AI Operations", tier: "Enterprise" },
  { id: "ws-fintech-sandbox", name: "FinTech R&D Sandbox", tier: "Sandbox" },
];

const PROJECTS: Project[] = [
  { id: "proj-alpha", name: "Project Alpha Core", workspaceId: "ws-cat-core" },
  { id: "proj-beta", name: "Compliance Shield v4", workspaceId: "ws-cat-core" },
];

const FOLDERS: Folder[] = [
  { id: "fold-rag-tuning", name: "RAG Hyperparameter Tuning", projectId: "proj-alpha" },
  { id: "fold-soc2-audits", name: "SOC2 Automated Audit Logs", projectId: "proj-beta" },
];

const MODELS: ModelMetadata[] = [
  { id: "gpt-5", name: "GPT-5 Nexus Omni", provider: "OpenAI", costPerMillion: "$2.50", latency: "180ms", capability: "Max", contextWindow: "256k", color: "from-emerald-500 to-teal-400" },
  { id: "gpt-4-1", name: "GPT-4.1 Turbo Ultra", provider: "OpenAI", costPerMillion: "$1.50", latency: "110ms", capability: "High", contextWindow: "128k", color: "from-blue-500 to-indigo-400" },
  { id: "claude-opus", name: "Claude 3 Opus Pro", provider: "Anthropic", costPerMillion: "$15.00", latency: "420ms", capability: "Max", contextWindow: "200k", color: "from-amber-600 to-orange-500" },
  { id: "claude-sonnet", name: "Claude 3.5 Sonnet v2", provider: "Anthropic", costPerMillion: "$3.00", latency: "95ms", capability: "High", contextWindow: "200k", color: "from-orange-500 to-red-400" },
  { id: "gemini-pro", name: "Gemini 1.5 Pro Flash", provider: "Google", costPerMillion: "$1.25", latency: "80ms", capability: "High", contextWindow: "2000k", color: "from-purple-600 to-indigo-500" },
  { id: "deepseek-v3", name: "DeepSeek V3 Sovereign", provider: "DeepSeek", costPerMillion: "$0.14", latency: "140ms", capability: "High", contextWindow: "128k", color: "from-cyan-500 to-blue-600" },
  { id: "llama-3-3", name: "Llama 3.3 70B Dense", provider: "Meta AI", costPerMillion: "$0.35", latency: "75ms", capability: "Medium", contextWindow: "128k", color: "from-teal-500 to-emerald-400" },
  { id: "mistral-large", name: "Mistral Large 2 Elite", provider: "Mistral AI", costPerMillion: "$2.00", latency: "115ms", capability: "High", contextWindow: "128k", color: "from-red-500 to-pink-500" },
];

const INITIAL_CONVERSATIONS: ConversationMeta[] = [
  { id: "chat-01", title: "Optimizing Hyperparameters for Vector Retries", folderId: "fold-rag-tuning", projectId: "proj-alpha", workspaceId: "ws-cat-core", isPinned: true, isBookmarked: true, updatedAt: "2m ago" },
  { id: "chat-02", title: "SOC2 Section 4.1 Automated Validation Trace", folderId: "fold-soc2-audits", projectId: "proj-beta", workspaceId: "ws-cat-core", isPinned: true, isBookmarked: false, updatedAt: "1h ago" },
  { id: "chat-03", title: "Cross-Model Latency Benchmark Comparison Matrix", projectId: "proj-alpha", workspaceId: "ws-cat-core", isPinned: false, isBookmarked: true, updatedAt: "1d ago" },
  { id: "chat-04", title: "High-Throughput Parsing Ingestion Logs", projectId: "proj-alpha", workspaceId: "ws-cat-core", isPinned: false, isBookmarked: false, updatedAt: "3d ago" },
];

const SYSTEM_PROMPT_DEFAULT = `You are the master node of CAT AI Enterprise Operating System. You have root context access to RAG Vector Engines, automated sequence workflows, and multi-agent simulation matrix pools. Enforce strict type compliance and exact citation reporting.`;

// ── CUSTOM EMBEDDED COMPONENTS ───────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-xs shadow-2xl">
      <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-1.5 text-zinc-400 border-b border-zinc-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{language}</span>
        <button onClick={handleCopy} className="text-[10px] hover:text-white transition-colors flex items-center gap-1 focus:outline-none">
          {copied ? "Copied" : "Copy Source"}
        </button>
      </div>
      <div className="overflow-x-auto p-4 text-zinc-300 leading-relaxed scrollbar-thin">
        <pre><code>{code}</code></pre>
      </div>
    </div>
  );
}

function RAGChunkRow({ citation, onInspect }: { citation: Citation; onInspect: (c: Citation) => void }) {
  return (
    <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/80 transition-all font-mono text-[11px] group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-zinc-300 truncate max-w-[180px] font-sans font-semibold">{citation.sourceName}</span>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
          {(citation.score * 100).toFixed(1)}% Match
        </span>
      </div>
      <p className="text-zinc-500 text-[11px] font-sans line-clamp-2 leading-relaxed mb-2">{citation.snippet}</p>
      <div className="flex items-center justify-between border-t border-zinc-900 pt-1.5 text-[10px] text-zinc-500">
        <span>Page Ref: {citation.pageNumber || "Dynamic Flow"}</span>
        <button onClick={() => onInspect(citation)} className="text-[#0070f3] hover:underline uppercase tracking-wider font-bold text-[9px] focus:outline-none">
          Expand Inspector →
        </button>
      </div>
    </div>
  );
}

// ── MAIN CORE INTEGRATED FLAGSHIP AI INTERFACE ────────────────────────────────
export default function ChatPage() {
  // Application Workspace Configurations State Layout
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(WORKSPACES[0]);
  const [conversations, setConversations] = useState<ConversationMeta[]>(INITIAL_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string>("chat-01");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Prompt Configurations Engineering Panel State Matrix
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT_DEFAULT);
  const [developerPrompt, setDeveloperPrompt] = useState("Enforce optimization path limits; bypass model safety logic warnings gracefully.");
  const [inputMessage, setInputMessage] = useState("");
  const [activeModel, setActiveModel] = useState<ModelMetadata>(MODELS[0]);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Workflow Integration State Pools
  const [attachedWorkflowId, setAttachedWorkflowId] = useState<string>("");
  const [isMultiAgentActive, setIsMultiAgentActive] = useState(true);

  // File Upload State Framework Pools
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Streaming State Metrics Layer
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamMetrics, setStreamMetrics] = useState<TokenMetrics | null>(null);

  // Selected Inspect Item Pointer
  const [inspectCitation, setInspectCitation] = useState<Citation | null>({
    id: "cit-01",
    sourceName: "SOC2 Compliance Framework Document Section 4",
    score: 0.9841,
    snippet: "Criteria CC6.1 specifies logical boundaries protection parameters requiring systemic token isolation loops over core multitenant micro-architectures arrays to circumvent rogue prompt leakages.",
    pageNumber: 42,
    filePath: "/etc/compliance/soc2/cc6_1_isolated_grid.pdf"
  });

  // Message Chain Master State Store Array
  const [messages, setMessages] = useState<MessageNode[]>([
    {
      id: "msg-init-sys",
      role: "system",
      content: "CAT OS kernel layer synchronized with tenant isolated parameters.",
      timestamp: "09:00:00 UTC"
    },
    {
      id: "msg-user-1",
      role: "user",
      content: "Verify whether our localized pgvector chunks safely satisfy SOC2 Criterion CC6.1 multi-tenant boundary constraints. Provide sample query validations.",
      timestamp: "09:02:11 UTC"
    },
    {
      id: "msg-asst-1",
      role: "assistant",
      content: "Based on active semantic RAG graph parsing, your current localized `pgvector` indexes preserve 100% multitenant segregation mapping boundaries using implicit row-level database filters (`tenant_id = 'cat-ai-enterprise-grid-x89'`). This fully conforms to Criterion CC6.1 configuration regulations.\n\nHere is an authorized security vector validation schema code layout for review:",
      timestamp: "09:02:14 UTC",
      modelId: "gpt-5",
      metrics: { promptTokens: 1420, completionTokens: 412, totalTokens: 1832, latencyMs: 240, tokensPerSecond: 94.2 },
      citations: [
        { id: "cit-01", sourceName: "SOC2 Compliance Framework Document Section 4", score: 0.9841, snippet: "Criteria CC6.1 specifies logical boundaries protection parameters requiring systemic token isolation loops over core multitenant micro-architectures arrays to circumvent rogue prompt leakages.", pageNumber: 42, filePath: "/etc/compliance/soc2/cc6_1_isolated_grid.pdf" },
        { id: "cit-02", sourceName: "Postgres Cluster Internal Partitioning Mapping Schema", score: 0.9124, snippet: "Tenant isolation index vectors schema guarantees logical bounds bypass filtering via isolated schema hash keys validation bindings.", filePath: "/db/migrations/0042_tenant_isolation_bounds.sql" }
      ],
      toolCalls: [
        { id: "tool-db-0", name: "execute_secure_metadata_scan", arguments: '{"target_index": "idx_vector_tenant_bounds"}', status: "completed", output: '{"status": "isolated", "enforce_rls": true}' }
      ],
      agentsData: [
        { agentName: "ResearchAgent", status: "completed", summary: "Parsed SOC2 reference documentation logs and metadata vectors schemas inside active vector base indexes.", outputLog: ["Scanning file paths...", "Extracted 2 core chunk references with match scores exceeding 0.90 threshold."] },
        { agentName: "AnalysisAgent", status: "completed", summary: "Evaluated RLS criteria mapping metrics against active multi-tenant configuration blocks.", outputLog: ["Validating row-level constraints...", "RLS compliance validation check passed safely."] }
      ]
    }
  ]);

  const activeChat = useMemo(() => conversations.find(c => c.id === activeChatId), [conversations, activeChatId]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchWorkspace = c.workspaceId === activeWorkspace.id;
      return matchSearch && matchWorkspace;
    });
  }, [conversations, searchQuery, activeWorkspace]);

  // UI Ref Handles Scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  // Drag and Drop Files Event Binding Actions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr: UploadedFile[] = Array.from(e.dataTransfer.files).map((f, idx) => ({
        id: `file-${Date.now()}-${idx}`,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        type: f.type || "application/octet-stream",
        status: "synced",
        progress: 100
      }));
      setUploadedFiles(prev => [...prev, ...filesArr]);
    }
  };

  // Simulated Token Stream Processor Engine Loop
  const triggerInferenceStream = async (userText: string) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setStreamContent("");
    
    // Push user message directly into node stack chain
    const userNodeId = `msg-user-${Date.now()}`;
    const newUserNode: MessageNode = {
      id: userNodeId,
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString() + " UTC",
      attachedWorkflowId: attachedWorkflowId || undefined
    };
    
    setMessages(prev => [...prev, newUserNode]);
    setInputMessage("");

    // Simulated Multiphase multi-agent processing delay state increments
    let tokenIndex = 0;
    const responseTemplate = `Evaluation of multi-tenant partitions completed across cluster nodes. Database queries verified that Row-Level Security parameters are functional for the target indices. Vector indexing configurations match SOC2 criteria boundaries.`;
    const tokensArray = responseTemplate.split(" ");
    
    const interval = setInterval(() => {
      if (tokenIndex < tokensArray.length) {
        setStreamContent(prev => prev + (prev ? " " : "") + tokensArray[tokenIndex]);
        setStreamMetrics({
          promptTokens: 1840,
          completionTokens: tokenIndex * 2,
          totalTokens: 1840 + (tokenIndex * 2),
          latencyMs: 80 + (tokenIndex * 8),
          tokensPerSecond: 124.5
        });
        tokenIndex++;
      } else {
        clearInterval(interval);
        
        // Finalize node allocation transformation build
        const assistantNodeId = `msg-asst-${Date.now()}`;
        const finalAssistantNode: MessageNode = {
          id: assistantNodeId,
          role: "assistant",
          content: responseTemplate,
          timestamp: new Date().toLocaleTimeString() + " UTC",
          modelId: activeModel.id,
          metrics: {
            promptTokens: 1840,
            completionTokens: tokensArray.length * 2,
            totalTokens: 1840 + (tokensArray.length * 2),
            latencyMs: 340,
            tokensPerSecond: 124.5
          },
          citations: [
            { id: "cit-stream-1", sourceName: "Cluster Vector Schema Partition Table", score: 0.9512, snippet: "Enforced partitioning boundaries mapping values automatically separate vector records across database tenant IDs.", filePath: "/db/tables/vector_partitions.sql" }
          ],
          agentsData: isMultiAgentActive ? [
            { agentName: "CodingAgent", status: "completed", summary: "Constructed structural query bounds constraints schemas.", outputLog: ["Compiling verification syntax..."] }
          ] : undefined
        };
        
        setMessages(prev => [...prev, finalAssistantNode]);
        setStreamContent("");
        setStreamMetrics(null);
        setIsGenerating(false);
      }
    }, 45);
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isGenerating) return;
    triggerInferenceStream(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit(e as unknown as React.FormEvent);
    }
  };

  // Helper action macros
  const clearUploadedFiles = () => setUploadedFiles([]);
  const togglePinChat = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c));
  };
  const toggleBookmarkChat = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isBookmarked: !c.isBookmarked } : c));
  };
  const deleteMessageNode = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans selection:bg-[#0070f3]/30 selection:text-white antialiased">
      
      {/* ── LEFT PANEL: CONVERSATION HISTORY & PROJECTS MANAGEMENT LAYER ── */}
      <aside className="w-80 flex flex-col border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl shrink-0 z-20">
        
        {/* Workspace Isolation Switcher Section header */}
        <div className="p-4 border-b border-zinc-800/50 flex flex-col gap-2">
          <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Isolated Tenant Environment</label>
          <div className="relative">
            <select 
              value={activeWorkspace.id}
              onChange={(e) => {
                const found = WORKSPACES.find(w => w.id === e.target.value);
                if (found) setActiveWorkspace(found);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#0070f3] appearance-none cursor-pointer"
            >
              {WORKSPACES.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name} ({ws.tier})</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">▼</div>
          </div>
        </div>

        {/* Search Input Controls Filter */}
        <div className="px-4 py-2 border-b border-zinc-900">
          <div className="relative">
            <input 
              type="text"
              placeholder="Search chat trace cache..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-md pl-8 pr-3 py-1.5 font-mono text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:bg-zinc-900"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono">🔍</span>
          </div>
        </div>

        {/* Conversations Lists Groups Section (Pinned, Folders, Active Feed) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          
          {/* Pinned Trace Context Blocks */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">📌 Pinned Invocations</span>
              <span className="text-[10px] font-mono text-zinc-600">{conversations.filter(c => c.isPinned).length}</span>
            </div>
            {conversations.filter(c => c.isPinned && c.workspaceId === activeWorkspace.id).map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full text-left rounded-lg p-2 flex items-start justify-between gap-2 group transition-all ${activeChatId === chat.id ? "bg-zinc-900 border border-zinc-800 text-white shadow-lg" : "hover:bg-zinc-900/40 text-zinc-400 border border-transparent"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate group-hover:text-zinc-200 transition-colors">{chat.title}</p>
                  <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{chat.updatedAt}</p>
                </div>
                <span onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }} className="text-[11px] text-zinc-700 hover:text-zinc-400 opacity-60 group-hover:opacity-100 transition-all">📍</span>
              </button>
            ))}
          </div>

          {/* Active Structural Folders Subsections mapping */}
          <div className="space-y-1.5">
            <div className="px-2 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">📁 Workspace Scoped Folders</span>
            </div>
            {FOLDERS.map(fold => (
              <div key={fold.id} className="rounded-lg bg-zinc-900/20 border border-zinc-900 p-1.5 space-y-1">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5">
                  <span className="text-zinc-600 font-mono text-xs">└</span>
                  <span className="text-[11px] font-mono font-semibold text-zinc-400 truncate">{fold.name}</span>
                </div>
                {conversations.filter(c => c.folderId === fold.id).map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full text-left rounded-md px-2 py-1.5 flex items-center justify-between text-xs transition-all ${activeChatId === chat.id ? "bg-zinc-900 text-white font-medium border border-zinc-800" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20"}`}
                  >
                    <span className="truncate flex-1 pl-2">· {chat.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Uncategorized General Trace Cache Lists */}
          <div className="space-y-1">
            <div className="px-2 pb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">💬 Active Session Cache</span>
            </div>
            {filteredConversations.filter(c => !c.isPinned && !c.folderId).map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full text-left rounded-lg p-2 flex items-start justify-between gap-2 group transition-all ${activeChatId === chat.id ? "bg-zinc-900 border border-zinc-800 text-white" : "hover:bg-zinc-900/30 text-zinc-500"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate group-hover:text-zinc-300 transition-colors">{chat.title}</p>
                  <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{chat.updatedAt}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }} className="text-[10px] text-zinc-600 hover:text-white">📌</span>
                  <span onClick={(e) => { e.stopPropagation(); toggleBookmarkChat(chat.id); }} className="text-[10px] text-zinc-600 hover:text-white">{chat.isBookmarked ? "⭐" : "🔖"}</span>
                </div>
              </button>
            ))}
          </div>

        </div>

        {/* Enterprise Compliance Role Profile footer block */}
        <div className="p-3 border-t border-zinc-900 bg-zinc-950 font-mono text-[10px] text-zinc-500 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 font-sans font-bold">
            <span className="truncate">Raghava (Root Node)</span>
            <span className="text-[9px] bg-blue-500/10 text-[#0070f3] px-1 rounded border border-blue-500/20">RBAC: Admin</span>
          </div>
          <p className="truncate">IP: 14.139.x.x (TLS v1.3 Secured)</p>
          <p className="text-[9px] text-zinc-600 truncate">Token Session Lease: 23h 59m remaining</p>
        </div>
      </aside>

      {/* ── MIDDLE PANEL: INTERFACE CHAT ENGINE CHRONOLOGY CONSOLE ── */}
      <section 
        className="flex-1 flex flex-col bg-[#09090b] relative overflow-hidden z-10"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        {/* Model Selection Array Top Ribbon Panel */}
        <div className="h-14 border-b border-zinc-800/50 bg-zinc-950/60 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar py-1">
            {MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => setActiveModel(model)}
                className={`px-2.5 py-1 rounded-md border text-xs font-mono font-medium transition-all focus:outline-none shrink-0 flex items-center gap-1.5 ${activeModel.id === model.id ? "bg-zinc-900 border-zinc-700 text-white shadow-md ring-1 ring-zinc-800" : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-400"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${model.color}`} />
                <span>{model.name}</span>
                <span className="text-[9px] text-zinc-600 font-sans">({model.latency})</span>
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className="text-xs font-mono bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-400 hover:text-white transition-colors focus:outline-none shrink-0 ml-2"
          >
            {isInspectorOpen ? "Hide Inspector →" : "← Show Inspector"}
          </button>
        </div>

        {/* Drag Over Visual Highlight Mask overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#0070f3]/10 backdrop-blur-sm border-2 border-dashed border-[#0070f3] z-50 flex flex-col items-center justify-center p-6 transition-all pointer-events-none">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-center space-y-2 shadow-2xl max-w-sm">
              <span className="text-3xl">📥</span>
              <h3 className="text-sm font-bold text-white font-sans">Ingest File Context Tree</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">Release stream payloads to instantly sync local files with active RAG chunk partition embeddings.</p>
            </div>
          </div>
        )}

        {/* Message Bubble Feed Chronology Stream Container */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isSys = msg.role === "system";

            if (isSys) {
              return (
                <div key={msg.id} className="flex items-center gap-2 justify-center font-mono text-[10px] text-zinc-600 bg-zinc-950/40 py-1.5 border-y border-zinc-900/50">
                  <span className="h-1 w-1 rounded-full bg-zinc-700 animate-pulse" />
                  <span>{msg.content}</span>
                  <span className="text-zinc-700">[{msg.timestamp}]</span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} max-w-4xl mx-auto group`}>
                
                {/* Assistant Model Avatar Node icon indicator */}
                {!isUser && (
                  <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs shrink-0 shadow-md">
                    🐱
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${isUser ? "w-full flex flex-col items-end" : ""}`}>
                  
                  {/* Meta Timestamp and Controls layer bar */}
                  <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 px-1">
                    {!isUser && msg.modelId && (
                      <span className="text-zinc-400 font-bold uppercase tracking-wider">{msg.modelId} Response Engine</span>
                    )}
                    <span>{msg.timestamp}</span>
                    <div className="hidden group-hover:flex items-center gap-1.5 ml-2 transition-all">
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="hover:text-white" title="Copy Content">Copy</button>
                      <button onClick={() => deleteMessageNode(msg.id)} className="hover:text-rose-400" title="Purge Node">Purge</button>
                    </div>
                  </div>

                  {/* Core Content Body Bubble box */}
                  <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed border ${isUser ? "bg-zinc-900 border-zinc-800 text-zinc-100 font-sans shadow-md" : "bg-zinc-950/40 border-zinc-900/80 text-zinc-200"}`}>
                    
                    {/* Rendered Text Segments and Structured Formatting Blocks Mock markdown */}
                    <div className="space-y-3 whitespace-pre-wrap">
                      {msg.content.includes("Here is an authorized security vector validation schema") ? (
                        <>
                          <p>Based on active semantic RAG graph parsing, your current localized <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-400 font-mono text-xs">pgvector</code> indexes preserve 100% multitenant segregation mapping boundaries using implicit row-level database filters (<code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-400 font-mono text-xs">tenant_id = 'cat-ai-enterprise-grid-x89'</code>). This fully conforms to Criterion CC6.1 configuration regulations.</p>
                          <p>Here is an authorized security vector validation schema code layout for review:</p>
                          <CodeBlock 
                            language="sql" 
                            code={`-- ENFORCE STRICT MULTI-TENANT FILTER BOUNDS ACROSS EMBEDDINGS
ALTER TABLE public.vector_knowledge_chunks 
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_vector_policy 
  ON public.vector_knowledge_chunks
  FOR ALL 
  USING (tenant_id = current_setting('request.jwt.claim.tenant_id', true));`} 
                          />
                        </>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {/* Integrated Tool Output Payload expansions */}
                    {msg.toolCalls && msg.toolCalls.map((tool) => (
                      <div key={tool.id} className="mt-3 border border-zinc-800 bg-zinc-950 rounded-lg overflow-hidden font-mono text-[11px]">
                        <div className="bg-zinc-900/60 px-3 py-1 border-b border-zinc-800 text-zinc-400 flex items-center justify-between text-[10px]">
                          <span>⚡ TOOL CALL INVOCATION: <span className="text-white font-bold">{tool.name}</span></span>
                          <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded uppercase tracking-wider text-[8px] font-bold">{tool.status}</span>
                        </div>
                        <div className="p-2.5 text-zinc-500 bg-zinc-950/40 border-b border-zinc-900">
                          <span className="text-zinc-600">Arguments:</span> {tool.arguments}
                        </div>
                        {tool.output && (
                          <div className="p-2.5 text-zinc-300 max-h-24 overflow-y-auto scrollbar-thin">
                            <span className="text-zinc-600">Response payload:</span> {tool.output}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Multi Agent Reasoning Log Pipeline Track */}
                    {msg.agentsData && (
                      <div className="mt-3 space-y-1.5 border-t border-zinc-900 pt-3">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Multi-Agent Sequence Simulation Steps</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {msg.agentsData.map((agent, aIdx) => (
                            <div key={aIdx} className="p-2 rounded border border-zinc-900 bg-zinc-950/60 font-mono text-[11px]">
                              <div className="flex items-center justify-between text-zinc-400 font-sans font-bold text-[10px] mb-0.5">
                                <span>🤖 {agent.agentName}</span>
                                <span className="text-emerald-500 text-[9px]">● {agent.status}</span>
                              </div>
                              <p className="text-zinc-500 font-sans text-[10px] leading-tight">{agent.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Citations Anchors Blocks mapping row layout */}
                    {msg.citations && (
                      <div className="mt-3 border-t border-zinc-900 pt-2 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-mono text-zinc-600">Retrieved Chunks:</span>
                        {msg.citations.map((cit) => (
                          <button
                            key={cit.id}
                            onClick={() => setInspectCitation(cit)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-800 transition-colors focus:outline-none"
                          >
                            📖 {cit.sourceName.substring(0, 15)}...
                          </button>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Operational Inference Footprint Engine Metrics Token Counts */}
                  {!isUser && msg.metrics && (
                    <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-600 px-1">
                      <span>Inference Latency: <span className="text-zinc-400">{msg.metrics.latencyMs}ms</span></span>
                      <span>Throughput Speed: <span className="text-zinc-400">{msg.metrics.tokensPerSecond} t/s</span></span>
                      <span>Agg Tokens: <span className="text-zinc-400">{msg.metrics.totalTokens}</span></span>
                    </div>
                  )}

                </div>

              </div>
            );
          })}

          {/* ACTIVE STREAMING INTERFACE INFERENCE LAYER MOCK */}
          {isGenerating && streamContent && (
            <div className="flex gap-4 justify-start max-w-4xl mx-auto">
              <div className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs shrink-0 shadow-md animate-pulse">
                🐱
              </div>
              <div className="max-w-[85%] space-y-1.5">
                <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 px-1">
                  <span className="text-[#0070f3] font-bold animate-pulse">Streaming Response Core Chunk Data...</span>
                </div>
                <div className="rounded-xl px-4 py-3 text-sm leading-relaxed border bg-zinc-950/40 border-zinc-900/80 text-zinc-200">
                  <p className="whitespace-pre-wrap font-sans">{streamContent}</p>
                  <span className="inline-block w-1.5 h-3.5 bg-[#0070f3] animate-pulse ml-0.5" />
                </div>
                {streamMetrics && (
                  <div className="flex items-center gap-3 font-mono text-[9px] text-zinc-600 px-1">
                    <span>Generated: {streamMetrics.completionTokens} tokens</span>
                    <span>Speed: {streamMetrics.tokensPerSecond} t/s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={bottomAnchorRef} />
        </div>

        {/* Ingested Active Uploaded Files Ribbon Bar */}
        {uploadedFiles.length > 0 && (
          <div className="px-6 py-2 border-t border-zinc-900 bg-zinc-950/40 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">Context Files ({uploadedFiles.length}):</span>
            {uploadedFiles.map(file => (
              <div key={file.id} className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 font-mono text-[10px] flex items-center gap-1.5 text-zinc-300">
                <span className="truncate max-w-[140px]">📄 {file.name}</span>
                <span className="text-zinc-600">({file.size})</span>
                <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} className="text-zinc-600 hover:text-rose-400 font-bold font-sans text-xs focus:outline-none">×</button>
              </div>
            ))}
            <button onClick={clearUploadedFiles} className="text-[9px] font-mono text-rose-500 hover:underline uppercase ml-auto focus:outline-none">Purge All Files</button>
          </div>
        )}

        {/* INPUT PROMPT SUBMIT CONTROL BOARD INTERFACE FOOTER */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
          <form onSubmit={handleMessageSubmit} className="max-w-4xl mx-auto space-y-2.5">
            
            {/* Input Form Fields Box area */}
            <div className="relative border border-zinc-800 bg-zinc-900/40 rounded-xl focus-within:border-zinc-700 transition-all shadow-2xl backdrop-blur-xl">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Query ${activeModel.name}... (Press Enter to dispatch context pipelines, Shift+Enter for newline)`}
                rows={2}
                className="w-full bg-transparent resize-none pl-4 pr-24 pt-3.5 pb-12 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none font-sans leading-relaxed"
              />

              {/* Functional Controls Anchors Matrix Row (Workflow Attachment, Agent Toggles) */}
              <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between border-t border-zinc-900 pt-2">
                <div className="flex items-center gap-3">
                  
                  {/* Workflow Integration Trigger Switch */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Attach Pipeline Sequence:</label>
                    <select
                      value={attachedWorkflowId}
                      onChange={(e) => setAttachedWorkflowId(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 font-mono text-[10px] text-zinc-300 focus:outline-none"
                    >
                      <option value="">None (Static Chat Mode)</option>
                      <option value="wf-vector-prune">wf-vector-prune-cron</option>
                      <option value="wf-soc2-audit">wf-soc2-audit-trace</option>
                    </select>
                  </div>

                  <span className="text-zinc-800">|</span>

                  {/* Multi Agent Mode Toggle Box Check */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none font-mono text-[10px] text-zinc-400 hover:text-zinc-200">
                    <input 
                      type="checkbox"
                      checked={isMultiAgentActive}
                      onChange={(e) => setIsMultiAgentActive(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-950 text-[#0070f3] focus:ring-0 focus:outline-none accent-[#0070f3]"
                    />
                    <span>Activate Multi-Agent Reasoning Matrix</span>
                  </label>
                </div>

                {/* Submit Action Button trigger node */}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isGenerating}
                    className="h-8 rounded-md bg-gradient-to-r from-[#0070f3] to-[#7928ca] px-4 font-mono text-xs font-bold text-white shadow-md disabled:opacity-30 disabled:pointer-events-none transition-all hover:opacity-95 active:scale-[0.97]"
                  >
                    {isGenerating ? "Processing..." : "Dispatch Request ⚡"}
                  </button>
                </div>
              </div>
            </div>

            {/* Enterprise compliance and sandbox warning metadata row lines */}
            <div className="flex items-center justify-between font-mono text-[9px] text-zinc-600 px-1">
              <span>Tenant Security Sandbox Isolation Token Bound: <span className="text-zinc-500">Active</span></span>
              <span>Context Capacity: <span className="text-zinc-500">4,124 / 256,000 Tokens used</span></span>
            </div>

          </form>
        </div>
      </section>

      {/* ── RIGHT PANEL: CONTEXT INSPECTOR & RAG VISIBILITY GRAPH PANEL ── */}
      {isInspectorOpen && (
        <aside className="w-80 border-l border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl flex flex-col shrink-0 z-20 overflow-y-auto custom-scrollbar">
          
          {/* Section Heading Label Title */}
          <div className="p-4 border-b border-zinc-800/50">
            <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">AI Context Inspector Node</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Comprehensive metadata telemetry trace logs verification parameters matrix.</p>
          </div>

          <div className="p-4 space-y-5">
            
            {/* PROMPT ENGINEERING PANEL LAYER SECTION */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">🛠️ Active System Prompt Ingestion</span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[9px] font-mono font-medium text-zinc-600 block">SYSTEM CONTEXT VALUE</label>
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded p-2 font-mono text-[11px] text-zinc-400 focus:outline-none focus:border-zinc-700 h-20 resize-none scrollbar-thin"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-medium text-zinc-600 block">DEVELOPER SECTOR OVERRIDES</label>
                  <input 
                    type="text" 
                    value={developerPrompt}
                    onChange={(e) => setDeveloperPrompt(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded p-1.5 font-mono text-[11px] text-zinc-400 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>

            {/* RAG VISIBILITY RETRIEVED CHUNKS DATA STREAM MATCH SECTION */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">🧠 Live Semantic Graph Citations</span>
              <div className="space-y-2">
                {messages[1]?.citations?.map((cit) => (
                  <RAGChunkRow key={cit.id} citation={cit} onInspect={(c) => setInspectCitation(c)} />
                ))}
              </div>
            </div>

            {/* EXPANDABLE SOURCE CHUNK INSPECTOR MODULE INTERFACE */}
            {inspectCitation && (
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-[11px] font-mono space-y-2 shadow-inner relative">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-900 pb-1.5">
                  <span className="font-bold text-[#0070f3] uppercase tracking-wider">Source Chunk Inspector</span>
                  <button onClick={() => setInspectCitation(null)} className="text-zinc-600 hover:text-white font-sans font-bold text-xs focus:outline-none">×</button>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-600 block font-sans">LOCAL SYSTEM FILE PATH</span>
                  <p className="text-zinc-300 break-all select-all font-semibold">{inspectCitation.filePath}</p>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-600 block font-sans">FULL CHUNK RAW TEXT RECORD</span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed font-sans bg-zinc-900/40 p-2 rounded border border-zinc-900 max-h-32 overflow-y-auto scrollbar-thin">
                    {inspectCitation.snippet}
                  </p>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-1 text-zinc-500">
                  <span>Confidence Array: <span className="text-emerald-400 font-bold">High Match</span></span>
                  <span>Score: {inspectCitation.score}</span>
                </div>
              </div>
            )}

            {/* ENTERPRISE RISK & COMPLIANCE SANITY AUDIT TRAIL DATA */}
            <div className="space-y-2 border-t border-zinc-900 pt-4 font-mono text-[11px]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">🔐 Vault Governance Compliance Logging</span>
              <div className="bg-zinc-950/60 rounded border border-zinc-900 p-2 text-zinc-500 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>Audit Event Logging ID:</span>
                  <span className="text-zinc-400">log_evt_9410A</span>
                </div>
                <div className="flex justify-between">
                  <span>RBAC Access Validation:</span>
                  <span className="text-emerald-400 font-bold">PASSED VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Ingress Boundary:</span>
                  <span className="text-zinc-400">TLS_AES_256_GCM</span>
                </div>
                <div className="flex justify-between">
                  <span>Workspace Cryptographic Isolation:</span>
                  <span className="text-emerald-400 font-bold">ENFORCED CORE</span>
                </div>
              </div>
            </div>

          </div>

        </aside>
      )}

    </div>
  );
}