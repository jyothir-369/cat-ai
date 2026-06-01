"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Layers,
  Database,
  Terminal,
  BarChart3,
  ShieldCheck,
  Activity,
  Lock,
  Mail,
  User,
  Building2,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Server,
  Zap,
  Check,
  ShieldAlert,
  Fingerprint,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & VALIDATION SCHEMAS (ZOD)
// ============================================================================

// Regex constraints matching modern enterprise standards
const uppercaseRegex = /[A-Z]/;
const lowercaseRegex = /[a-z]/;
const numberRegex = /[0-9]/;
const specialCharRegex = /[^A-Za-z0-9]/;
const workspaceSlugRegex = /^[a-z0-9-]+$/;

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, { message: "Legal full name is required for profile identity" })
      .max(70, { message: "Name parameter limit exceeded" }),
    email: z
      .string()
      .min(1, { message: "Enterprise corporate email is required" })
      .email({ message: "Please use a valid enterprise email format" }),
    companyName: z
      .string()
      .min(1, { message: "Legal entity or organization corporate name is required" }),
    workspaceName: z
      .string()
      .min(1, { message: "Workspace namespace mapping label cannot be empty" })
      .regex(workspaceSlugRegex, {
        message: "Workspace mapping address can only include lowercase characters, numbers, and dashes",
      }),
    password: z
      .string()
      .min(12, { message: "Identity pass architecture strictly requires a minimum of 12 characters" })
      .refine((val) => uppercaseRegex.test(val), { message: "Must include an uppercase character token" })
      .refine((val) => lowercaseRegex.test(val), { message: "Must include a lowercase character token" })
      .refine((val) => numberRegex.test(val), { message: "Must contain an integer digit cluster" })
      .refine((val) => specialCharRegex.test(val), { message: "Must contain a specialized variant symbol" }),
    confirmPassword: z.string().min(1, { message: "Identity confirmation payload is missing" }),
    termsCheckbox: z.literal(true, {
      errorMap: () => ({ message: "Acceptance of Master Service Level Agreement protocol is mandatory" }),
    }),
    newsletterCheckbox: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Cryptographic confirmation hash mismatch",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// Premium SVG Component Overlays
const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.48 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.008.069-.008 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 23 23" fill="currentColor">
    <path fill="#f35325" d="M1 1h10v10H1z"/>
    <path fill="#81bc06" d="M12 1h10v10H12z"/>
    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
    <path fill="#ffba08" d="M12 12h10v10H12z"/>
  </svg>
);

// ============================================================================
// MAIN PREMIUM SAAS REGISTRATION & WORKSPACE INITIALIZATION GATEWAY
// ============================================================================

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth(); // Integrated hook parameters for seamless operational continuity
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // React Hook Form Configuration mapping the validation architecture constraints
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      companyName: "",
      workspaceName: "",
      password: "",
      confirmPassword: "",
      termsCheckbox: undefined,
      newsletterCheckbox: false,
    },
  });

  // Watch streams for real-time validation visual rendering components
  const watchedPassword = useWatch({ control, name: "password" }) || "";
  const watchedWorkspace = useWatch({ control, name: "workspaceName" }) || "";

  // Password structural verification computation
  const passwordCriteria = {
    length: watchedPassword.length >= 12,
    upper: uppercaseRegex.test(watchedPassword),
    lower: lowercaseRegex.test(watchedPassword),
    num: numberRegex.test(watchedPassword),
    special: specialCharRegex.test(watchedPassword),
  };

  const metCount = Object.values(passwordCriteria).filter(Boolean).length;
  
  const getStrengthMeta = () => {
    if (!watchedPassword) return { score: 0, text: "Not Initialized", color: "bg-zinc-800", textColor: "text-zinc-600" };
    if (metCount <= 2) return { score: 1, text: "Weak Structural Boundary", color: "bg-rose-500", textColor: "text-rose-400" };
    if (metCount === 3) return { score: 2, text: "Fair Execution Bounds", color: "bg-amber-500", textColor: "text-amber-400" };
    if (metCount === 4) return { score: 3, text: "Good Defensive Profile", color: "bg-indigo-500", textColor: "text-indigo-400" };
    if (metCount === 5) return { score: 4, text: "Strong Core Integrity", color: "bg-emerald-500", textColor: "text-emerald-400" };
    return { score: 0, text: "Not Initialized", color: "bg-zinc-800", textColor: "text-zinc-600" };
  };

  const strength = getStrengthMeta();

  // Submission Pipeline Integration Routine
  async function onSubmit(data: RegisterFormData) {
    setServerError(null);
    setLoading(true);
    try {
      // Intentional micro-delay matching professional premium onboarding telemetry structures
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Execute security provisioning matrix integration simulation link
      // If endpoint requires real mutation, substitute custom call structure here.
      setSuccess(true);
      
      // Automatic system context redirection timeline mapping loop
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Workspace provisioning sequence rejected. Internal infrastructure collision.";
      setServerError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#030304] text-zinc-100 overflow-hidden font-sans antialiased selection:bg-amber-500/30">
      
      {/* ============================================================================
          LEFT PANEL: EXTENDED MARKETING DIRECTORY, TELEMETRY GRID & STATS (45% WIDTH)
         ============================================================================ */}
      <section className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative border-r border-zinc-900 bg-gradient-to-b from-zinc-950 via-[#070709] to-[#030304] overflow-y-auto select-none">
        {/* Structural High-End Fluid Ambient Gradients */}
        <div className="absolute top-[-15%] left-[-15%] w-[90%] h-[60%] bg-gradient-to-br from-amber-500/10 via-orange-600/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[70%] h-[50%] bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent rounded-full blur-[120px] pointer-events-none" />
        
        {/* Visual Identity Grid Matrix Backing */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1e_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_70%,transparent_100%)] opacity-[0.15] pointer-events-none" />

        {/* Master Logo Identifier Group */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-2xl shadow-black/80 backdrop-blur-md group cursor-pointer">
            <Cpu className="h-5.5 w-5.5 text-amber-500 transition-transform group-hover:rotate-90 duration-500" />
          </div>
          <div>
            <span className="text-xl font-black tracking-widest text-zinc-100 font-mono">CAT AI</span>
            <div className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase flex items-center gap-1">
              <span>Cluster Orchestrator Core</span>
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          </div>
        </div>

        {/* Structural High-Capacity Architecture Features List */}
        <div className="relative z-10 my-auto py-10 space-y-10 max-w-md">
          <div className="space-y-4">
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-widest text-amber-400 border border-amber-500/20 bg-amber-500/5 rounded-full uppercase inline-block">
              Scale Architecture Cluster Layer
            </span>
            <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-500 leading-tight">
              Enterprise AI Operating System.
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed font-sans">
              Build intelligent agents, automate workflows, and scale enterprise operations through a unified AI platform.
            </p>
          </div>

          {/* Matrix Grid Array */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Cpu, title: "Autonomous Agents", desc: "Deploy specialized, autonomous AI worker pipelines." },
              { icon: Database, title: "Knowledge Systems", desc: "Build highly indexed, searchable neural enterprise memories." },
              { icon: Terminal, title: "Workflow Automation", desc: "Construct event-driven deterministic execution trees." },
              { icon: BarChart3, title: "Advanced Analytics", desc: "Monitor multi-agent telemetry and compliance in real time." },
              { icon: Layers, title: "Multi-Tenant Mesh", desc: "Workspace shard isolation with granular cross-org RBAC layers." },
              { icon: ShieldCheck, title: "Enterprise Security", desc: "Zero-trust compliant core parameters matching strict standards." },
            ].map((feat, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-900/60 backdrop-blur-sm space-y-1.5 transition-all hover:border-zinc-800 hover:bg-zinc-950/80 group"
              >
                <div className="flex items-center gap-2">
                  <feat.icon className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                  <h4 className="text-xs font-mono font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors uppercase tracking-wide">
                    {feat.title}
                  </h4>
                </div>
                <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-normal font-sans">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Operational Matrix Core Feeds Monitor */}
        <div className="relative z-10 pt-6 border-t border-zinc-900/80 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
            <span className="uppercase tracking-widest font-bold text-[10px]">Telemetry Stream Core</span>
            <div className="flex items-center gap-1.5 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/20 rounded-md text-emerald-400 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>System Status: Operational</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-950/50 border border-zinc-900/80 p-3 rounded-xl backdrop-blur-md font-mono">
            {[
              { label: "AI Requests", val: "1.4M/day", icon: Sparkles },
              { label: "Workflows Executed", val: "48M+", icon: Server },
              { label: "Knowledge Chunks", val: "2.3B+", icon: Database },
              { label: "Agent Uptime", val: "99.99%", icon: Zap },
            ].map((node, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-1 text-zinc-600">
                  <node.icon className="h-3 w-3" />
                  <span className="text-[9px] uppercase tracking-tighter block">{node.label}</span>
                </div>
                <span className="text-xs font-black tracking-tight text-zinc-300 block">{node.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================================
          RIGHT PANEL: COMPREHENSIVE ONBOARDING DISCOVERY & FORM WIZARD (55% WIDTH)
         ============================================================================ */}
      <section className="w-full lg:w-[55%] flex flex-col justify-between p-5 sm:p-10 md:p-12 xl:p-16 relative bg-[#050507] overflow-y-auto">
        <div className="absolute bottom-0 right-0 w-[45%] h-[40%] bg-gradient-to-tl from-indigo-600/5 via-transparent to-transparent rounded-full blur-[140px] pointer-events-none" />

        {/* Top Link Path Matrix Mapping Indicator */}
        <div className="flex justify-between items-center font-mono text-xs text-zinc-500 pb-6">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600">Provision Node Layer</span>
          <div className="flex items-center gap-1.5">
            <span>Already indexed?</span>
            <Link href="/auth/login" className="text-zinc-300 font-bold hover:text-amber-400 transition-colors flex items-center gap-0.5">
              Sign In <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Root Registration Module Workspace Processing Frame */}
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.main 
              key="registration-form-pane"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="my-auto mx-auto w-full max-w-xl space-y-8 py-6 relative z-10"
            >
              {/* Header Title Information Context */}
              <div className="space-y-1.5 text-center sm:text-left">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  Create Your CAT AI Workspace
                </h1>
                <p className="text-xs text-zinc-400 font-sans">
                  Start building intelligent multi-agent collaborative networks and secure enterprise memory shards.
                </p>
              </div>

              {/* Social Federated Identity Core Integrations */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <button 
                  type="button"
                  onClick={() => alert("Forwarding token index mapping request to Google Directory...")}
                  className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900/80 rounded-xl px-3 py-2.5 transition-colors font-bold active:scale-98"
                >
                  <GoogleIcon /> Google
                </button>
                <button 
                  type="button"
                  onClick={() => alert("Forwarding token index mapping request to GitHub Provider...")}
                  className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900/80 rounded-xl px-3 py-2.5 transition-colors font-bold active:scale-98"
                >
                  <GitHubIcon /> GitHub
                </button>
                <button 
                  type="button"
                  onClick={() => alert("Forwarding token index mapping request to Azure Infrastructure...")}
                  className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900/80 rounded-xl px-3 py-2.5 transition-colors font-bold active:scale-98"
                >
                  <MicrosoftIcon /> Azure
                </button>
                <button 
                  type="button"
                  onClick={() => alert("Forwarding connection track to enterprise cloud proxy framework...")}
                  className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 border border-zinc-900/80 rounded-xl px-3 py-2.5 transition-colors font-bold active:scale-98 text-zinc-400 hover:text-zinc-200"
                >
                  SSO Gateway
                </button>
              </div>

              {/* Graphical Divider Layout Block */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-[9px] font-mono uppercase font-bold tracking-widest text-zinc-600">
                  Or manual namespace registration directory
                </span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              {/* Core Execution Form Handling Engine */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Server Error Message Alert Framework Block */}
                {serverError && (
                  <div className="rounded-xl border border-rose-950/40 bg-rose-500/5 p-3 flex gap-3 text-xs text-rose-400 font-mono items-start" role="alert">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wide">Provisioning Core Halt</span>
                      <p className="opacity-90 font-sans mt-0.5">{serverError}</p>
                    </div>
                  </div>
                )}

                {/* Input Elements Row Group A: Full Name & Work Email Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <label htmlFor="fullName" className="font-bold text-zinc-400 uppercase tracking-tight">Full Name</label>
                      {errors.fullName && <span className="text-[10px] text-rose-400">⚠️ Required</span>}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        disabled={loading}
                        {...register("fullName")}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 font-sans placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        placeholder="Alexander Wright"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <label htmlFor="email" className="font-bold text-zinc-400 uppercase tracking-tight">Work Email</label>
                      {errors.email && <span className="text-[10px] text-rose-400">⚠️ Invalid format</span>}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        disabled={loading}
                        {...register("email")}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 font-sans placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        placeholder="wright@enterprise.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Input Elements Row Group B: Company Entity Identifier & Workspace Address Namespace mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <label htmlFor="companyName" className="font-bold text-zinc-400 uppercase tracking-tight">Company Name</label>
                      {errors.companyName && <span className="text-[10px] text-rose-400">⚠️ Required</span>}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="companyName"
                        type="text"
                        autoComplete="organization"
                        disabled={loading}
                        {...register("companyName")}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 font-sans placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        placeholder="Nexus Corp"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <label htmlFor="workspaceName" className="font-bold text-zinc-400 uppercase tracking-tight">Workspace Namespace</label>
                      {errors.workspaceName && <span className="text-[10px] text-rose-400">⚠️ Alphanumeric / dashes</span>}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                        <Globe className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="workspaceName"
                        type="text"
                        disabled={loading}
                        {...register("workspaceName")}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 font-sans placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        placeholder="nexus-operations"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Realtime Ingress Slug Routing Preview Workspace Node Element Card */}
                <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-2.5 font-mono text-[11px] flex items-center justify-between text-zinc-500">
                  <span className="uppercase tracking-tight text-[9px] font-bold text-zinc-600">Generated Endpoint Cluster Route:</span>
                  <div className="flex items-center gap-1 text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800/80">
                    <span className="text-zinc-600">cat-ai.io/</span>
                    <span className="text-amber-400 font-bold">{watchedWorkspace || "your-workspace-slug"}</span>
                  </div>
                </div>

                {/* Input Elements Row Group C: Passwords and Security Boundary Verifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <label htmlFor="password" className="font-bold text-zinc-400 uppercase tracking-tight">Security Password</label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        disabled={loading}
                        {...register("password")}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl pl-9 pr-8 py-2 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <label htmlFor="confirmPassword" className="font-bold text-zinc-400 uppercase tracking-tight">Confirm Hash</label>
                      {errors.confirmPassword && <span className="text-[10px] text-rose-400">⚠️ Mismatch</span>}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        disabled={loading}
                        {...register("confirmPassword")}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-200 font-mono placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength Telemetry Multi-tier Visual Track */}
                <div className="space-y-2 bg-zinc-950/30 border border-zinc-900/60 p-3 rounded-xl">
                  <div className="flex justify-between items-center font-mono text-[11px]">
                    <span className="text-zinc-500">Security Defensive Capacity Evaluation:</span>
                    <span className={`font-bold uppercase tracking-wide text-[10px] ${strength.textColor}`}>{strength.text}</span>
                  </div>
                  {/* Dynamic Meter Bars */}
                  <div className="grid grid-cols-4 gap-1.5 h-1">
                    {[1, 2, 3, 4].map((barIdx) => (
                      <div 
                        key={barIdx} 
                        className={`h-full rounded-full transition-all duration-300 ${
                          strength.score >= barIdx ? strength.color : "bg-zinc-900"
                        }`}
                      />
                    ))}
                  </div>
                  {/* Live Validation Requirements Matrix Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 pt-1 font-mono text-[10px]">
                    {[
                      { met: passwordCriteria.length, text: "Min 12 Characters" },
                      { met: passwordCriteria.upper, text: "Uppercase Mapping [A-Z]" },
                      { met: passwordCriteria.lower, text: "Lowercase Mapping [a-z]" },
                      { met: passwordCriteria.num, text: "Integer Character [0-9]" },
                      { met: passwordCriteria.special, text: "Variant Symbol [!@#...]" },
                    ].map((req, idx) => (
                      <div key={idx} className={`flex items-center gap-1.5 transition-colors ${req.met ? "text-emerald-400" : "text-zinc-600"}`}>
                        <Check className={`h-3 w-3 ${req.met ? "opacity-100" : "opacity-30"}`} />
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkboxes Strategy Blocks */}
                <div className="space-y-2 pt-1 font-mono text-xs text-zinc-500">
                  <div className="space-y-1">
                    <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                      <input
                        type="checkbox"
                        {...register("termsCheckbox")}
                        disabled={loading}
                        className="mt-0.5 rounded border-zinc-900 bg-zinc-950 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
                      />
                      <span className="group-hover:text-zinc-400 font-sans transition-colors leading-normal">
                        I hereby authorize execution and accept the binding conditions of the{" "}
                        <Link href="/legal/terms" className="text-zinc-400 hover:text-amber-400 font-bold underline font-mono text-[11px]">
                          CAT AI Master Service Agreement
                        </Link>{" "}
                        and architectural operations protocols.
                      </span>
                    </label>
                    {errors.termsCheckbox && (
                      <span className="text-[10px] text-rose-400 block pl-5" role="alert">
                        ⚠️ {errors.termsCheckbox.message}
                      </span>
                    )}
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      {...register("newsletterCheckbox")}
                      disabled={loading}
                      className="mt-0.5 rounded border-zinc-900 bg-zinc-950 text-amber-500 focus:ring-amber-500/20 accent-amber-500"
                    />
                    <span className="group-hover:text-zinc-400 font-sans transition-colors leading-normal">
                      Subscribe cluster terminal logs to receive real-time updates regarding agent features and ecosystem patches.
                    </span>
                  </label>
                </div>

                {/* Final Form Trigger Operational Dispatch Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-zinc-950 font-black font-mono text-xs uppercase tracking-widest py-3 rounded-xl border border-amber-500/20 shadow-2xl transition-all active:scale-98 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                      <span>Provisioning Secure Architecture Core...</span>
                    </>
                  ) : (
                    <>
                      <span>Provision Corporate Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-950" />
                    </>
                  )}
                </button>
              </form>

              {/* Sequential Workspace Onboarding Lifecycle Timeline Map Track */}
              <div className="border-t border-zinc-900/80 pt-5 space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-600 uppercase block">
                  Workspace Initialization Lifecycle Sequence
                </span>
                <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[9px] uppercase tracking-tighter text-zinc-500" aria-label="Onboarding Sequence Steps">
                  {[
                    { step: "1", name: "Create Node" },
                    { step: "2", name: "Config Agents" },
                    { step: "3", name: "Link Memories" },
                    { step: "4", name: "Pipe Workflows" },
                    { step: "5", name: "Scale Matrix" },
                  ].map((s, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 bg-zinc-950/40 border border-zinc-900/60 p-2 rounded-lg">
                      <span className="h-3.5 w-3.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold flex items-center justify-center shrink-0">
                        {s.step}
                      </span>
                      <span className="truncate block font-medium">{s.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.main>
          ) : (
            /* ============================================================================
                ONBOARDING SUCCESS COMPLIANCE INTERFACE SCREEN
               ============================================================================ */
            <motion.main 
              key="onboarding-success-pane"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="my-auto mx-auto w-full max-w-md text-center space-y-6 py-12 relative z-10 font-mono"
            >
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-2xl flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-7 w-7 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black text-zinc-100 uppercase tracking-tight">
                  Workspace Created Successfully
                </h2>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto font-sans leading-relaxed">
                  Namespace tokens compiled. Security infrastructure configuration mapping initialized to standard variables profiles.
                </p>
              </div>

              {/* Artificial Shell Real-time Compilation Log Output Console */}
              <div className="bg-zinc-950 border border-zinc-900 text-[10px] text-zinc-400 p-4 rounded-xl text-left font-mono space-y-1.5 shadow-2xl">
                <div className="flex items-center gap-2 text-zinc-600 border-b border-zinc-900/60 pb-1.5 mb-2">
                  <Server className="h-3 w-3" />
                  <span>Deployment Controller Terminal logs</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500">
                  <span>✔</span> <span>Org directory identity sharding complete</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500">
                  <span>✔</span> <span>Workspace namespace mapping linked to cat-ai.io/{watchedWorkspace}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-500">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span>Configuring authorization proxy filters...</span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span>Redirecting session state parameters to Dashboard Console...</span>
              </div>
            </motion.main>
          )}
        </AnimatePresence>

        {/* ============================================================================
            FOOTER ARCHITECTURE INFORMATION DIRECTORY
           ============================================================================ */}
        <footer className="pt-8 border-t border-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-[11px] text-zinc-600 relative z-10">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-3.5 w-3.5 text-zinc-700" />
            <span>Zero-Trust Infrastructure Network Ingress</span>
          </div>

          <nav className="flex items-center gap-4 text-zinc-600 font-sans" aria-label="Legal Metadata Links">
            <Link href="/legal/privacy" className="hover:text-zinc-400 transition-colors text-xs">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-zinc-400 transition-colors text-xs">Terms of Service</Link>
            <Link href="/legal/security" className="hover:text-zinc-400 transition-colors text-xs font-mono">Security Index</Link>
          </nav>
        </footer>
      </section>

    </div>
  );
}