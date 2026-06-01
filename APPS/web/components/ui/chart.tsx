"use client";

import * as React from "react";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, 
  Radar, PolarGrid, PolarAngleAxis, Cell, Legend 
} from "recharts";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// ============================================================================
// SYSTEM DESIGN TOKENS
// ============================================================================

const COLORS = {
  indigo: "#6366f1",
  purple: "#a855f7",
  emerald: "#10b981",
  rose: "#f43f5e",
};

// ============================================================================
// CORE ANALYTICS PRIMITIVES
// ============================================================================

export const MetricCard = ({ title, value, trend }: { title: string; value: string; trend: string }) => {
  const isPositive = trend.startsWith("+");
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 shadow-sm">
      <span className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-wider">{title}</span>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-black text-zinc-100">{value}</span>
        <div className={cn("flex items-center text-[10px] font-bold", isPositive ? "text-emerald-500" : "text-rose-500")}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
          {trend}
        </div>
      </div>
    </div>
  );
};

export const ChartContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("w-full h-[300px] rounded-xl border border-zinc-900 bg-zinc-950 p-4", className)}>
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  </div>
);

// ============================================================================
// COMPOSABLE CHART COMPONENTS
// ============================================================================

export const AreaChartComponent = ({ data, dataKey, color = COLORS.indigo }: any) => (
  <ChartContainer>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
          <stop offset="95%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
      <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
      <YAxis stroke="#52525b" fontSize={10} />
      <Tooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a" }} />
      <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill="url(#colorArea)" />
    </AreaChart>
  </ChartContainer>
);

export const RadarChartComponent = ({ data }: any) => (
  <ChartContainer>
    <RadarChart outerRadius={90} data={data}>
      <PolarGrid stroke="#27272a" />
      <PolarAngleAxis dataKey="subject" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
      <Radar name="Performance" dataKey="value" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.6} />
      <Tooltip />
    </RadarChart>
  </ChartContainer>
);

// ============================================================================
// ADVANCED OBSERVABILITY INTEGRATION
// ============================================================================

/**
 * Enterprise analytics architecture requires visualizing multi-dimensional data
 * such as token usage, latency, and vector storage growth.
 */