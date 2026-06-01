"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
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
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Fingerprint,
  KeyRound,
  Globe2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ============================================================================
// SYSTEM TYPE DEFINITIONS & VALIDATION SCHEMAS (ZOD)
// ============================================================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email address is required to authenticate" })
    .email({ message: "Please enter a valid enterprise email format" }),
  password: z
    .string()
    .min(1, { message: "Security access password is required" })
    .min(8, { message: "Security boundary enforces minimum 8 characters" }),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Custom SVG Icons components for premium corporate social network integration
const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.48 text-zinc-100 0-.197-.741-.197-1.454-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.0.069-.608 0 1.004.755 1.531 2.574 1.531 1.516 0 2.229-.945 2.528-1.423.461-.791 1.214-1.022 1.511-1.115.1-.307.223-.518.359-.637-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
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
// MAIN PREMIUM SAAS AUTHENTICATION INTERFACE
// ============================================================================

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // React Hook Form initialization with structural validation mapping
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    }
  });

  // Mutative processing flow upon submitting credentials
  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    setLoading(true);
    try {
      await login({ email: data.email, password: data.password });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Authentication sequence rejected. Check parameters or credentials.";
      setServerError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#030303] text-zinc-100 overflow-hidden font-sans antialiased selection:bg-amber-500/30">
      
      {/* ============================================================================
          LEFT PANEL: BRAND ARCHITECTURE, METRICS & VISUAL MATRIX (40% WIDTH)
         ============================================================================ */}
      <section className="hidden xl:flex xl:w-[40%] flex-col justify-between p-10 relative border-r border-zinc-900 bg-gradient-to-b from-zinc-950 via-[#09090b] to-[#040405] overflow-hidden select-none">
        {/* Dynamic High-End Structural Neon Particle Accent Paths */}
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-gradient-to-br from-amber-500/10 via-orange-600/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none" />
        
        {/* Particle Overlay Background Network Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15]" />

        {/* Brand System Core Identifier */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-lg shadow-black/50 backdrop-blur-md">
            <Cpu className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <span className="text-lg font-black tracking-widest text-zinc-100 font-mono">CAT AI</span>
            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest text-amber-400 border border-amber-500/20 bg-amber-500/5 rounded uppercase">
              OS v4.1
            </span>
          </div>
        </div>

        {/* Feature Highlights Matrix Grid Stack */}
        <div className="relative z-10 my-auto space-y-8 max-w-sm">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-500 uppercase block">
              Enterprise AI Operating System
            </span>
            <h2 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-600 leading-tight">
              Orchestrate Context Across Sharded Vector Systems.
            </h2>
          </div>

          <nav className="space-y-3 font-mono text-xs text-zinc-400" aria-label="Feature Matrix">
            {[
              { icon: Cpu, label: "Autonomous AI Agents" },
              { icon: Layers, label: "Multi-Agent Collaboration Framework" },
              { icon: Database, label: "Enterprise Knowledge Base Clusters" },
              { icon: Terminal, label: "Workflow Automation Runbooks" },
              { icon: BarChart3, label: "Advanced Analytics Telemetry Realtime" },
              { icon: ShieldCheck, label: "Zero-Trust Architecture Security" },
            ].map((feat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 py-1 px-2.5 rounded-lg hover:bg-zinc-900/40 border border-transparent hover:border-zinc-900 transition-all group"
              >
                <feat.icon className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                <span className="group-hover:text-zinc-200 transition-colors">{feat.label}</span>
              </motion.div>
            ))}
          </nav>
        </div>

        {/* Customer Metrics & Operational Status Infrastructure Footer */}
        <div className="relative z-10 pt-6 border-t border-zinc-900 space-y-6">
          <div className="grid grid-cols-2 gap-4 font-mono">
            {[
              { val: "1.2M+", desc: "Daily Compute Ingress" },
              { val: "99.99%", desc: "SLA Core Availability" },
              { val: "200+", desc: "Enterprise Entities Locked" },
              { val: "12TB+", desc: "Vector Cloud Matrix" },
            ].map((stat, idx) => (
              <div key={idx} className="space-y-0.5">
                <span className="text-base font-black tracking-tight text-zinc-200 block">{stat.val}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-tight">{stat.desc}</span>
              </div>
            ))}
          </div>

          {/* Realtime Live Infrastructure Pulse Indicator */}
          <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-900 px-3 py-2 rounded-xl backdrop-blur-md">
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>All nodes online across global ingress sectors</span>
            </div>
            <Activity className="h-3 w-3 text-zinc-600 animate-pulse" />
          </div>
        </div>
      </section>

      {/* ============================================================================
          RIGHT PANEL: MAIN AUTHENTICATION COMPONENT CARD LAYER (60% WIDTH)
         ============================================================================ */}
      <section className="w-full xl:w-[60%] flex flex-col justify-between p-6 md:p-12 lg:p-16 relative bg-[#060608] overflow-y-auto">
        <div className="absolute top-0 right-0 w-[50%] h-[40%] bg-gradient-to-bl from-indigo-600/5 via-transparent to-transparent rounded-full blur-[120px] pointer-events-none" />

        {/* Header link block for secondary callouts */}
        <div className="flex justify-end font-mono text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Identity Node Gateway Ingress</span>
            <Globe2 className="h-3 w-3 text-zinc-600 animate-spin-slow" />
          </div>
        </div>

        {/* Core Main Login Form Container Frame */}
        <main className="my-auto mx-auto w-full max-w-md space-y-8 py-12 relative z-10">
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm font-medium font-sans">
              Continue managing your AI agents, knowledge systems, workflow automations, and enterprise operations.
            </p>
          </div>

          {/* Social Single Sign-On Integration Clusters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
            <button 
              onClick={() => alert("Redirecting identity request flow to federated Google OAuth directory index...")}
              className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border border-zinc-900 rounded-xl px-4 py-2.5 shadow-xl transition-all font-bold active:scale-98"
            >
              <GoogleIcon /> Google
            </button>
            <button 
              onClick={() => alert("Redirecting identity request flow to secure GitHub credential repository...")}
              className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border border-zinc-900 rounded-xl px-4 py-2.5 shadow-xl transition-all font-bold active:scale-98"
            >
              <GitHubIcon /> GitHub
            </button>
            <button 
              onClick={() => alert("Redirecting identity request flow to Entra ID active index pipeline...")}
              className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border border-zinc-900 rounded-xl px-4 py-2.5 shadow-xl transition-all font-bold active:scale-98"
            >
              <MicrosoftIcon /> Azure
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-900"></div>
            <span className="flex-shrink mx-4 text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-600">
              Or continuous secure token login
            </span>
            <div className="flex-grow border-t border-zinc-900"></div>
          </div>

          {/* Form Processing Implementation Wrapper */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Server Error Response Exception Alert Notice Pane */}
            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl border border-rose-950/40 bg-rose-500/5 p-3 flex gap-3 text-xs text-rose-400 font-mono items-start"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wide">Identity Exception Fired</span>
                    <p className="opacity-90 font-sans mt-0.5">{serverError}</p>
                  </div>
                </motion.div>
              )}

              {/* Server Access Sequence Authentication Success Feedback Window */}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-emerald-950/40 bg-emerald-500/5 p-3 flex gap-3 text-xs text-emerald-400 font-mono items-start"
                  role="alert"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wide">Authorization Cryptogram Verified</span>
                    <p className="opacity-90 font-sans mt-0.5">Redirecting execution routine to workspace console dashboard grid...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Field Block: Target User Corporate Email Address Input Element */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <label htmlFor="email" className="font-bold text-zinc-400 uppercase tracking-tight">
                  Corporate Email Identifier
                </label>
                {errors.email && (
                  <span className="text-[10px] text-rose-400 font-medium" role="alert">
                    ⚠️ {errors.email.message}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email ? "true" : "false"}
                  {...register("email")}
                  disabled={loading || success}
                  className={`w-full bg-zinc-950/60 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 shadow-xl font-mono focus:outline-none focus:ring-1 transition-all ${
                    errors.email 
                      ? "border-rose-900/60 focus:ring-rose-500/30 focus:border-rose-500" 
                      : "border-zinc-900 focus:ring-amber-500/20 focus:border-amber-500"
                  }`}
                  placeholder="name@enterprise.com"
                />
              </div>
            </div>

            {/* Field Block: Corporate Cryptographic Secure Pass Validation Access */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <label htmlFor="password" className="font-bold text-zinc-400 uppercase tracking-tight">
                  Cryptographic Password Pass
                </label>
                {errors.password && (
                  <span className="text-[10px] text-rose-400 font-medium" role="alert">
                    ⚠️ {errors.password.message}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-600">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={errors.password ? "true" : "false"}
                  {...register("password")}
                  disabled={loading || success}
                  className={`w-full bg-zinc-950/60 border rounded-xl pl-10 pr-10 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 shadow-xl font-mono focus:outline-none focus:ring-1 transition-all ${
                    errors.password 
                      ? "border-rose-900/60 focus:ring-rose-500/30 focus:border-rose-500" 
                      : "border-zinc-900 focus:ring-amber-500/20 focus:border-amber-500"
                  }`}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password context payload" : "Reveal cleartext characters profile"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Auxiliary Row Options Flags Block */}
            <div className="flex items-center justify-between font-mono text-xs pt-1">
              <label className="flex items-center gap-2 text-zinc-500 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  disabled={loading || success}
                  className="rounded border-zinc-900 bg-zinc-950 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 focus:outline-none accent-amber-500"
                />
                <span className="group-hover:text-zinc-400 transition-colors">Persist local token node</span>
              </label>
              
              <Link 
                href="/auth/recovery" 
                className="text-zinc-500 hover:text-amber-400 transition-colors font-bold uppercase tracking-tight text-[11px]"
              >
                Forgot credentials Matrix?
              </Link>
            </div>

            {/* Master Administrative Form Action Sign In Target Trigger */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-zinc-950 font-black font-mono text-xs uppercase tracking-widest py-3 rounded-xl border border-amber-500/20 shadow-xl transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                  <span>Validating Identity Profile Matrix...</span>
                </>
              ) : success ? (
                <span>Access Granted</span>
              ) : (
                <>
                  <span>Sign In To Core Engine</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-950" />
                </>
              )}
            </button>
          </form>

          {/* Dedicated Centralized Identity Provider SAML SSO Relay Route */}
          <button
            onClick={() => alert("Routing connection track to secure corporate enterprise SAML 2.0 Ingress Portal...")}
            className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 font-mono font-bold uppercase tracking-wide py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
            Continue with Enterprise SSO Proxy
          </button>
        </main>

        {/* ============================================================================
            FOOTER ARCHITECTURE LEVEL CONTROL LEDGERS & LEGAL SECURITY METRICS
           ============================================================================ */}
        <footer className="pt-12 border-t border-zinc-900/60 flex flex-col md:flex-row md:items-center justify-between gap-6 font-mono text-xs text-zinc-600 relative z-10">
          
          {/* Security Claims Certifications Integration Subrow */}
          <div className="flex flex-wrap items-center gap-4 border border-zinc-900/80 bg-zinc-950/40 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Fingerprint className="h-3.5 w-3.5 text-amber-500/60" />
              <span className="font-bold">Enterprise Security Vault Layered:</span>
            </div>
            <span className="text-[9px] font-bold bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-zinc-500">JWT AUTH</span>
            <span className="text-[9px] font-bold bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-zinc-500">MFA CAPABLE</span>
            <span className="text-[9px] font-bold bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-zinc-500">SOC 2 TYPE II</span>
            <span className="text-[9px] font-bold bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-zinc-500">ISO 27001</span>
          </div>

          {/* Absolute Navigation Directory Tree Paths */}
          <div className="flex items-center gap-4 text-[11px] font-medium font-sans">
            <span className="text-zinc-500 text-xs font-mono font-normal">
              Need an account?{" "}
              <Link href="/register" className="text-zinc-300 font-bold hover:text-amber-400 transition-colors font-sans ml-1">
                Create Account
              </Link>
            </span>
            <span className="text-zinc-800 font-mono">|</span>
            <Link href="/legal/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
            <Link href="/legal/security" className="hover:text-zinc-400 transition-colors">Security Index</Link>
          </div>
        </footer>
      </section>

    </div>
  );
}