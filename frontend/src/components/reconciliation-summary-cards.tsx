import React from "react";
import { ReconciliationSummary } from "../services/reconciliation-api";
import { CheckCircle, AlertTriangle, Coins, TrendingUp, Layers, HelpCircle } from "lucide-react";

interface ReconciliationSummaryCardsProps {
  summary: ReconciliationSummary;
}

export function ReconciliationSummaryCards({ summary }: ReconciliationSummaryCardsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalMatches = summary.matched_count;
  const totalRecords = summary.total_bank_transactions || 1;
  const matchRate = ((totalMatches / totalRecords) * 100).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Match Efficiency Rate */}
      <div className="p-5 bg-black/40 border border-white/[0.05] rounded-2xl flex flex-col justify-between space-y-3 shadow-inner hover:border-white/10 transition-all group">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-sans">Match Efficiency Rate</span>
          <TrendingUp className="h-4 w-4 text-emerald-400/80 group-hover:text-emerald-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-3xl font-black text-white tracking-tight font-mono">{matchRate}%</h3>
          <p className="text-[10px] text-neutral-500 mt-2 uppercase tracking-wide">
            <span className="text-emerald-400 font-bold">{summary.matched_count}</span> auto-reconciled statements
          </p>
        </div>
      </div>

      {/* Matched Volume */}
      <div className="p-5 bg-black/40 border border-white/[0.05] rounded-2xl flex flex-col justify-between space-y-3 shadow-inner hover:border-white/10 transition-all group">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-sans">Reconciled Volume</span>
          <CheckCircle className="h-4 w-4 text-emerald-400/80 group-hover:text-emerald-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-3xl font-black text-emerald-400 tracking-tight font-mono text-shadow-sm">
            {formatCurrency(summary.matched_amount)}
          </h3>
          <p className="text-[10px] text-neutral-500 mt-2 uppercase tracking-wide">
            Cleared and audit-locked assets
          </p>
        </div>
      </div>

      {/* Unmatched Review Volume */}
      <div className="p-5 bg-black/40 border border-white/[0.05] rounded-2xl flex flex-col justify-between space-y-3 shadow-inner hover:border-white/10 transition-all group">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-sans">Discrepancy Volume</span>
          <AlertTriangle className="h-4 w-4 text-rose-400/80 group-hover:text-rose-400 transition-colors" />
        </div>
        <div>
          <h3 className="text-3xl font-black text-rose-400 tracking-tight font-mono text-shadow-sm">
            {formatCurrency(summary.unmatched_amount)}
          </h3>
          <p className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1.5 uppercase tracking-wide">
            <span className="text-rose-400 font-bold">{summary.mismatch_count + summary.unmatched_count}</span> reviews pending
          </p>
        </div>
      </div>

      {/* Datasets Composition */}
      <div className="p-5 bg-black/40 border border-white/[0.05] rounded-2xl flex flex-col justify-between space-y-3 shadow-inner hover:border-white/10 transition-all group">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 font-sans">Composition</span>
          <Layers className="h-4 w-4 text-blue-400/80 group-hover:text-blue-400 transition-colors" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500">Bank Records:</span>
            <span className="text-white font-semibold font-mono">{summary.total_bank_transactions}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500">Ledger Records:</span>
            <span className="text-white font-semibold font-mono">{summary.total_external_transactions}</span>
          </div>
          {summary.duplicate_count > 0 && (
            <div className="flex justify-between items-center text-[10px] text-orange-400/80 pt-1">
              <span className="uppercase tracking-wide font-bold">Duplicates Blocked:</span>
              <span className="font-bold font-mono">{summary.duplicate_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
