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
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">Match Efficiency Rate</span>
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight font-mono">{matchRate}%</h3>
          <p className="text-[10px] text-slate-400 mt-1">
            <span className="text-emerald-400 font-bold">{summary.matched_count}</span> auto-reconciled statements
          </p>
        </div>
      </div>

      {/* Matched Volume */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">Reconciled Volume</span>
          <CheckCircle className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-emerald-400 tracking-tight font-mono">
            {formatCurrency(summary.matched_amount)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Cleared and audit-locked assets
          </p>
        </div>
      </div>

      {/* Unmatched Review Volume */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">Discrepancy Volume</span>
          <AlertTriangle className="h-4 w-4 text-rose-400" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-rose-400 tracking-tight font-mono">
            {formatCurrency(summary.unmatched_amount)}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-rose-400 font-bold">{summary.mismatch_count + summary.unmatched_count}</span> reviews pending
          </p>
        </div>
      </div>

      {/* Datasets Composition */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">Composition</span>
          <Layers className="h-4 w-4 text-blue-400" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Bank Records:</span>
            <span className="text-white font-semibold font-mono">{summary.total_bank_transactions}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Ledger Records:</span>
            <span className="text-white font-semibold font-mono">{summary.total_external_transactions}</span>
          </div>
          {summary.duplicate_count > 0 && (
            <div className="flex justify-between items-center text-[10px] text-orange-400">
              <span>Duplicates Blocked:</span>
              <span className="font-semibold font-mono">{summary.duplicate_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
