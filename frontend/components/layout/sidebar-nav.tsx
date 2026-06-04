"use client";

import React from "react";
import { 
  BarChart3, 
  Layers, 
  History, 
  Settings, 
  Terminal,
  Database,
  Sparkles
} from "lucide-react";

import { useReconciliation } from "../../context/reconciliation-context";
import { useAuth } from "../../hooks/use-auth";

export function SidebarNav() {
  const { role, isHydrated, logout } = useAuth();
  const { activeTab, setActiveTab, previewData, reconciliationSummary } = useReconciliation();
  const previewDataAvailable = !!previewData;
  const reconciliationSummaryAvailable = !!reconciliationSummary;
  return (
    <aside className="w-[280px] border-r border-white/[0.05] bg-black flex flex-col justify-between p-5 shrink-0 z-10 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10">
        {/* Platform Title */}
        <div className="flex items-center gap-3 px-2 py-4 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-extrabold text-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Sparkles className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white leading-tight">BANK AI</h1>
            <p className="text-[11px] text-neutral-500 font-medium tracking-wide uppercase">Workspace Ops</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab("workspace")}
            disabled={!previewDataAvailable}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !previewDataAvailable 
                ? "opacity-30 cursor-not-allowed text-neutral-600" 
                : activeTab === "workspace"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <Layers className="h-4 w-4" />
            Reconciliation Workspace
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            disabled={!reconciliationSummaryAvailable}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !reconciliationSummaryAvailable 
                ? "opacity-30 cursor-not-allowed text-neutral-600" 
                : activeTab === "analytics"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Advanced Analytics
          </button>
          <button
            onClick={() => setActiveTab("investigation")}
            disabled={!reconciliationSummaryAvailable}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !reconciliationSummaryAvailable 
                ? "opacity-30 cursor-not-allowed text-neutral-600" 
                : activeTab === "investigation"
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <Terminal className="h-4 w-4" />
            Smart Investigation
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <History className="h-4 w-4" />
            History & Audits
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "settings"
                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            }`}
          >
            <Settings className="h-4 w-4" />
            Platform Settings
          </button>
        </nav>
      </div>

      {/* Database Status Footer Info */}
      <div className="space-y-4 relative z-10">
        <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.05] space-y-3 shadow-inner">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-2 font-medium">
              <Database className="h-3.5 w-3.5 text-neutral-500" /> Database
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-2 font-medium">
              <Terminal className="h-3.5 w-3.5 text-neutral-500" /> Pipeline
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[10px]">
              LOCAL DEV
            </span>
          </div>
        </div>
        
        <div className="p-3.5 bg-black rounded-xl border border-white/[0.05] shadow-lg flex items-center justify-between group hover:border-white/10 transition-colors">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Simulated Role</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold mt-0.5 flex items-center gap-1.5">
              {isHydrated ? role : 'LOADING'}
            </span>
          </div>
          <button 
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-500 text-[11px] font-bold transition-colors ring-1 ring-inset ring-red-500/10 hover:ring-red-500/30"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
