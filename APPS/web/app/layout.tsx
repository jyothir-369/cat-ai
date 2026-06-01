import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const inter = Inter({
subsets: ["latin"],
variable: "--font-sans",
display: "swap",
});

export const viewport: Viewport = {
themeColor: "#050816",
colorScheme: "dark light",
width: "device-width",
initialScale: 1,
maximumScale: 5,
};

export const metadata: Metadata = {
metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://cat-ai.enterprise"),
title: {
default: "CAT AI — Enterprise AI Operating System",
template: "%s | CAT AI",
},
description: "Build AI Agents, Automate Workflows, Manage Knowledge, and Scale Enterprise Intelligence from a single platform.",
applicationName: "CAT AI OS",
authors: [{ name: "CAT AI Core Engineering", url: "https://cat-ai.enterprise/team" }],
generator: "Next.js 14 Engine",
creator: "CAT AI Corporation",
publisher: "CAT AI Platform Operations",
keywords: [
"Enterprise AI",
"AI Operating System",
"Autonomous Agents",
"Workflow Automation",
"RAG Pipelines",
"Knowledge Graphs",
"Multi-Agent Mesh",
"SaaS LLM Orchestration",
"Vector Memory Systems"
],
robots: {
index: true,
follow: true,
googleBot: {
index: true,
follow: true,
"max-video-preview": -1,
"max-image-preview": "large",
"max-snippet": -1,
},
},
alternates: {
canonical: "/",
languages: {
"en-US": "/en-US",
},
},
icons: {
icon: [
{ url: "/favicon.ico", sizes: "any" },
{ url: "/icon.svg", type: "image/svg+xml" },
],
apple: "/apple-touch-icon.png",
},
openGraph: {
type: "website",
siteName: "CAT AI Operating System",
title: "CAT AI — Enterprise AI Operating System",
description: "Build AI Agents, Automate Workflows, Manage Knowledge, and Scale Enterprise Intelligence from a single platform.",
url: "https://cat-ai.enterprise",
locale: "en_US",
images: [
{
url: "/og-core-distribution.png",
width: 1200,
height: 630,
alt: "CAT AI Enterprise Engine OS Cluster Blueprint",
},
],
},
twitter: {
card: "summary_large_image",
site: "@cataios",
creator: "@cataios",
title: "CAT AI — Enterprise AI Operating System",
description: "Build AI Agents, Automate Workflows, Manage Knowledge, and Scale Enterprise Intelligence from a single platform.",
images: ["/og-core-distribution.png"],
},
category: "technology",
};

interface RootLayoutProps {
children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
const jsonLdData = {
"@context": "https://schema.org",
"@type": "SoftwareApplication",
"name": "CAT AI",
"applicationCategory": "BusinessApplication, ArtificialIntelligence",
"operatingSystem": "All modern web browsers",
"description": "Enterprise AI Operating System for multi-agent execution arrays, hybrid vector datastore management pipelines, and visual workflow loop configurations.",
"offers": {
"@type": "Offer",
"price": "0.00",
"priceCurrency": "USD",
"description": "Developer Blueprint Tier"
}
};

return (
<html
lang="en"
className={`${inter.variable} scroll-smooth`}
suppressHydrationWarning
>

<script
type="application/ld+json"
dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
/>

      {/* ── HIGH PERFORMANCE COMPLIANT VISUAL AMBIENT INFRASTRUCTURE ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Global Base Raster Mesh Layer */}
        <div className="absolute inset-0 bg-slate-950 effect-bg-grid opacity-100" />
        
        {/* Multi-Cluster Ambient Lighting Vectors */}
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 h-[800px] w-[800px] translate-y-1/3 rounded-full bg-gradient-to-tr from-cyan-500/10 via-teal-500/5 to-transparent blur-3xl animate-float" />
        
        {/* Dark Mode Baseline Shading Map Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#050816_80%)] opacity-60" />
      </div>

      {/* ── ENTERPRISE CONSOLE APPLICATION WORKSPACE ── */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {children}
      </div>

      {/* ── STRUCTURAL GLOBAL ACCESSIBILITY & UTILITY SLOTS ── */}
      <div id="cat-ai-global-notification-viewport" className="fixed top-4 right-4 z-[9999] flex w-full max-w-sm flex-col gap-2 pointer-events-none" <div/>
      <div id="cat-ai-global-command-palette-portal" className="fixed inset-0 z-[9990] pointer-events-none" />
      <div id="cat-ai-global-modal-portal" className="fixed inset-0 z-[9980] pointer-events-none" />
      <div id="cat-ai-global-tooltip-portal" className="absolute pointer-events-none z-[10000]" />
      
    </AuthProvider>
  </body>
</html>
);
}