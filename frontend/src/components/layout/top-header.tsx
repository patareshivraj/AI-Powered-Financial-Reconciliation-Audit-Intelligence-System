"use client";

import React from "react";
import { Sparkles } from "lucide-react";

import { useReconciliation } from "../../context/reconciliation-context";

export function TopHeader() {
  const { activeTab, sessionId } = useReconciliation();
  return (
    <header className="h-16 border-b border-white/[0.05] bg-black/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-white tracking-wide">
          {activeTab === "dashboard" && "Platform Overview"}
          {activeTab === "workspace" && "Reconciliation Workspace"}
          {activeTab === "analytics" && "Advanced Analytics"}
          {activeTab === "investigation" && "Smart Investigation Copilot"}
          {activeTab === "history" && "Audit History"}
          {activeTab === "settings" && "Platform Settings"}
        </h2>
        <div className="h-4 w-px bg-white/[0.1]"></div>
        <p className="text-[11px] text-neutral-500 font-medium hidden sm:flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-emerald-500/70" />
          Intelligence Engine Active
        </p>
      </div>
      <div className="flex items-center gap-3">
        {sessionId && (
          <div className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-semibold shadow-inner">
            Session: {sessionId.substring(0, 8).toUpperCase()}
          </div>
        )}
        <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.1] text-[10px] font-mono text-neutral-400 font-medium">
          v0.3.0-rc
        </div>
      </div>
    </header>
  );
}
