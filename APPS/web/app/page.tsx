import React from "react";
import Link from "next/link";

// ── TYPES & INTERFACES ───────────────────────────────────────────────────────
interface FeatureCardProps {
icon: React.ReactNode;
title: string;
description: string;
badge?: string;
}

interface StatCardProps {
label: string;
value: string;
change: string;
isPositive: boolean;
}

interface WorkflowStepProps {
number: string;
title: string;
description: string;
metric?: string;
}

interface PricingCardProps {
name: string;
price: string;
period?: string;
description: string;
features: string[];
ctaText: string;
isPopular?: boolean;
glowColor?: string;
}

interface TestimonialCardProps {
quote: string;
author: string;
role: string;
company: string;
avatarText: string;
rating?: number;
}

interface FAQItemProps {
question: string;
answer: string;
}

// ── MAIN LANDING PAGE ARCHITECTURE ───────────────────────────────────────────
export default function HomePage() {
const currentYear = new Date().getFullYear();

return (

);
}

// ── REUSABLE STRUCTURAL PATTERN SUB-COMPONENTS ───────────────────────────────

function StatCard({ label, value, change, isPositive }: StatCardProps) {
return (

{label}

{value}
<div className={text-xs font-mono font-bold px-1.5 py-0.5 rounded ${isPositive ? "text-emerald-400 bg-emerald-950/40" : "text-rose-400 bg-rose-950/40"}}>
{change}



);
}

function FeatureCard({ icon, title, description, badge }: FeatureCardProps) {
return (


{icon}


{title}
{badge && (

{badge}

)}

{description}

);
}

function WorkflowStep({ number, title, description, metric }: WorkflowStepProps) {
return (


{number}

{title}
{description}
{metric && (

Runtime Metrics: {metric}

)}

);
}

function PricingCard({ name, price, period, description, features, ctaText, isPopular, glowColor }: PricingCardProps) {
return (
<div
className={flex flex-col justify-between rounded-2xl p-8 bg-[#0F172A]/80 border transition-all relative ${ isPopular  ? "border-indigo-500 shadow-2xl lg:scale-[1.03] z-10"  : "border-slate-800/80 hover:border-slate-700" }}
style={{ boxShadow: isPopular && glowColor ? 0 0 40px -5px ${glowColor} : undefined }}
>


{name}
{isPopular && (

RECOMMENDED CLUSTER

)}


{price}
{period && / {period}}

{description}

);
}

function TestimonialCard({ quote, author, role, company, avatarText }: TestimonialCardProps) {
return (

“{quote}”


{avatarText}


{author}

{role}, {company}




);
}

function FAQItem({ question, answer }: FAQItemProps) {
return (


Q.
{question}

{answer}

);
}

// ── SYSTEM PLATFORM EMBEDDED GRAPHICS ORCHESTRATION ICONS ───────────────────

function AgentIcon() {
return (



);
}

function KnowledgeIcon() {
return (



);
}

function WorkflowIcon() {
return (



);
}

function AnalyticsIcon() {
return (



);
}

/* Re-verify structural mapping team vector objects code definition context */
function TeamIcon() {
return (



);
}

function SecurityIcon() {
return (



);
}

function CheckIcon() {
return (



);
}