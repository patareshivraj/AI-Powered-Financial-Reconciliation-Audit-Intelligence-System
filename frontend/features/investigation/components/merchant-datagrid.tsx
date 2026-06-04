"use client";

import React, { useEffect, useState } from "react";
import { Store, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
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
        <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/[0.05]">
              <tr>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px]">Merchant / Entity</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Transactions</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Total Volume</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Mismatches</th>
                <th className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px] text-right">Risk Score</th>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
