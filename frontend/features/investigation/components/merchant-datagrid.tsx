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
      <div className="w-full h-48 flex items-center justify-center bg-slate-900/20 border border-slate-800 rounded-2xl animate-pulse">
        <RefreshCw className="h-6 w-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="w-full p-8 bg-slate-900/20 border border-slate-800 rounded-2xl text-center">
        <Store className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-mono">No merchant data available for this session.</p>
      </div>
    );
  }

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Store className="h-4 w-4 text-blue-400" /> Merchant & Entity Intelligence
      </h3>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/20 text-slate-400 font-mono">
                <th className="p-3 font-medium">Merchant / Entity</th>
                <th className="p-3 font-medium text-right">Transactions</th>
                <th className="p-3 font-medium text-right">Total Volume</th>
                <th className="p-3 font-medium text-right">Mismatches</th>
                <th className="p-3 font-medium text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((row, i) => {
                const riskColor = row.risk_score > 50 ? "text-rose-400" : row.risk_score > 20 ? "text-yellow-400" : "text-emerald-400";
                const riskBg = row.risk_score > 50 ? "bg-rose-500/10 border-rose-500/20" : row.risk_score > 20 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-emerald-500/10 border-emerald-500/20";
                return (
                  <tr key={i} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-3">
                      <span className="text-slate-200 font-medium truncate block max-w-[220px]">{row.merchant}</span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">{row.transaction_count}</td>
                    <td className="p-3 text-right font-mono text-slate-200 font-bold">{fmt(row.total_volume)}</td>
                    <td className="p-3 text-right">
                      {row.mismatch_count > 0 ? (
                        <span className="text-rose-400 font-mono font-bold flex items-center justify-end gap-1">
                          <AlertTriangle className="h-3 w-3" /> {row.mismatch_count}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono">0</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${riskBg} ${riskColor}`}>
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
