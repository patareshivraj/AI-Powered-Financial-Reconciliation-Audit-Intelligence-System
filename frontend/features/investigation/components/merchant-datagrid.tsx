"use client";

import React, { useEffect, useState } from "react";
import { Store, TrendingUp, AlertTriangle, RefreshCw, Eye, X, Activity, Loader2, Sparkles, FileText } from "lucide-react";
import { InvestigationApiService } from "../services/investigation-api";

interface MerchantRow {
  merchant: string;
  transaction_count: number;
  total_volume: number;
  mismatch_count: number;
  risk_score: number;
}

export function MerchantDatagrid({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Deep Dive State
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [deepDiveData, setDeepDiveData] = useState<any>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  const fetchDeepDive = async (merchantName: string) => {
    setSelectedMerchant(merchantName);
    setDeepDiveLoading(true);
    setDeepDiveData(null);
    try {
      const res = await InvestigationApiService.getMerchantDeepDive(sessionId, merchantName);
      if (res.success && res.data) {
        setDeepDiveData(res.data);
      }
    } catch (e) {
      console.error("Deep dive failed", e);
    } finally {
      setDeepDiveLoading(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await InvestigationApiService.getMerchantIntelligence(sessionId);
        if (res.success && res.data) setRows(res.data as MerchantRow[]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-2xl animate-pulse shadow-inner">
        <RefreshCw className="h-6 w-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="w-full p-8 bg-black/40 border border-white/[0.05] rounded-2xl text-center shadow-inner">
        <Store className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
        <p className="text-[11px] text-neutral-500 font-mono tracking-wide">NO MERCHANT DATA AVAILABLE FOR THIS SESSION.</p>
      </div>
    );
  }

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-white flex items-center gap-2 tracking-wide uppercase">
        <Store className="h-4 w-4 text-emerald-400" /> Merchant & Entity Intelligence
      </h3>
      <div className="rounded-2xl border border-white/[0.05] bg-[#09090b] shadow-2xl overflow-hidden ring-1 ring-white/5">
        <div className="overflow-x-auto max-h-[calc(100vh-450px)] min-h-[300px] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/[0.05]">
              <tr>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px]">Merchant / Entity</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Transactions</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Total Volume</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Mismatches</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Risk Score</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {rows.map((row, i) => {
                const riskColor = row.risk_score > 50 ? "text-rose-400" : row.risk_score > 20 ? "text-yellow-400" : "text-emerald-400";
                const riskBg = row.risk_score > 50 ? "bg-rose-500/10 border-rose-500/20" : row.risk_score > 20 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-emerald-500/10 border-emerald-500/20";
                return (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 border-b border-white/[0.02]">
                      <span className="text-neutral-200 font-medium truncate block max-w-[220px]">{row.merchant}</span>
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.02] text-right font-mono text-neutral-400">
                      {row.transaction_count}
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.02] text-right font-mono text-neutral-200 font-bold">
                      {fmt(row.total_volume)}
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.02] text-right">
                      {row.mismatch_count > 0 ? (
                        <span className="text-rose-400 font-mono font-bold flex items-center justify-end gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded w-fit ml-auto">
                          <AlertTriangle className="h-3 w-3" /> {row.mismatch_count}
                        </span>
                      ) : (
                        <span className="text-neutral-500 font-mono">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.02] text-right">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono border shadow-sm ${riskBg} ${riskColor}`}>
                        {row.risk_score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-white/[0.02] text-center">
                      <button 
                        onClick={() => fetchDeepDive(row.merchant)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all text-[10px] font-bold uppercase tracking-wider mx-auto"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Dive Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#09090b] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Store className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{selectedMerchant}</h2>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">Intelligence Deep Dive</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMerchant(null)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {deepDiveLoading ? (
                <div className="w-full h-48 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                  <span className="text-xs text-neutral-400 font-mono animate-pulse">Running Llama-3 AI Analysis...</span>
                </div>
              ) : deepDiveData ? (
                <>
                  {/* AI Summary Panel */}
                  <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles className="h-16 w-16 text-emerald-500" />
                    </div>
                    <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
                      <Activity className="h-4 w-4" /> AI Analyst Summary
                    </h3>
                    <p className="text-sm text-neutral-300 leading-relaxed max-w-3xl">
                      {deepDiveData.ai_summary}
                    </p>
                    <div className="mt-4 pt-4 border-t border-emerald-500/10 flex items-center gap-4">
                      <div className="text-[10px] font-mono text-emerald-400/80 uppercase">
                        Risk Level: <span className="font-bold text-emerald-400">{deepDiveData.ai_risk_level}</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400/80 uppercase">
                        Mismatches: <span className="font-bold text-emerald-400">{deepDiveData.mismatch_count} / {deepDiveData.total_transactions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <FileText className="h-4 w-4 text-blue-400" /> Merchant Transactions
                    </h3>
                    <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden ring-1 ring-white/5">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                          <tr>
                            <th className="px-4 py-3 font-bold text-neutral-400 uppercase text-[10px]">Date</th>
                            <th className="px-4 py-3 font-bold text-neutral-400 uppercase text-[10px]">Ref ID</th>
                            <th className="px-4 py-3 font-bold text-neutral-400 uppercase text-[10px] text-right">Amount</th>
                            <th className="px-4 py-3 font-bold text-neutral-400 uppercase text-[10px]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {deepDiveData.transactions.map((tx: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-2.5 text-neutral-300 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2.5 text-neutral-400 font-mono text-[10px]">{tx.reference}</td>
                              <td className="px-4 py-2.5 text-neutral-200 font-mono font-bold text-right">{fmt(tx.amount)}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  tx.status === 'MATCHED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                  {tx.status.replace(/_/g, " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 text-neutral-500 font-mono text-sm">Failed to load deep dive.</div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
